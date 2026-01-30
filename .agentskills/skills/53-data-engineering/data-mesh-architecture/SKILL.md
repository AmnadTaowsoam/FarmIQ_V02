---
name: Data Mesh Architecture
description: Decentralized data architecture treating data as a product with domain ownership, self-serve platform, and federated governance.
---

# Data Mesh Architecture

## Overview

Data Mesh เป็น decentralized sociotechnical approach ต่อ data architecture โดยย้าย ownership ของ data ไปยัง domain teams แทน centralized data team ประกอบด้วย 4 principles: Domain Ownership, Data as a Product, Self-serve Platform, และ Federated Governance

## Why This Matters

- **Scale**: Decentralized ownership enables parallel development
- **Quality**: Domain experts own and understand their data best
- **Agility**: Teams can move independently
- **Trust**: Clear accountability for data products

---

## Core Concepts

### 1. Domain Data Products

```typescript
// data-products/orders/product.yaml
name: orders-data-product
domain: commerce
owner: orders-team@company.com
description: "Order transactions and lifecycle events"

# Data contracts
outputs:
  - name: orders_fact
    type: table
    schema: schemas/orders_fact.json
    sla:
      freshness: "15 minutes"
      availability: "99.9%"
    quality_rules:
      - rule: no_null_order_id
        sql: "SELECT COUNT(*) FROM orders_fact WHERE order_id IS NULL"
        threshold: 0
      - rule: valid_amounts
        sql: "SELECT COUNT(*) FROM orders_fact WHERE total_amount < 0"
        threshold: 0

  - name: order_events
    type: stream
    topic: commerce.orders.events.v1
    schema: schemas/order_event.avro

# Dependencies
inputs:
  - data_product: customers-data-product
    output: customers_dim
  - data_product: products-data-product  
    output: products_dim

# Discovery metadata
tags: ["orders", "commerce", "transactions"]
pii_columns: ["customer_email", "shipping_address"]
```

### 2. Self-Serve Data Platform

```typescript
// platform/data-product-sdk/src/index.ts

export class DataProduct {
  private config: DataProductConfig;
  private qualityChecker: QualityChecker;
  private catalog: DataCatalog;
  
  constructor(configPath: string) {
    this.config = loadConfig(configPath);
    this.qualityChecker = new QualityChecker(this.config.outputs);
    this.catalog = new DataCatalog();
  }
  
  // Publish data with automatic quality checks
  async publish(output: string, data: DataFrame): Promise<PublishResult> {
    // Run quality rules
    const qualityResult = await this.qualityChecker.validate(output, data);
    
    if (!qualityResult.passed) {
      throw new DataQualityError(qualityResult.failures);
    }
    
    // Write to storage
    const location = await this.writeToStorage(output, data);
    
    // Update catalog
    await this.catalog.registerVersion({
      product: this.config.name,
      output,
      location,
      schema: data.schema,
      stats: data.statistics,
      quality: qualityResult,
    });
    
    // Emit lineage event
    await this.emitLineageEvent(output, data.lineage);
    
    return { success: true, location, version: data.version };
  }
  
  // Consume other data products
  async consume(productName: string, output: string): Promise<DataFrame> {
    // Check access permissions
    await this.checkAccess(productName, output);
    
    // Get latest version from catalog
    const version = await this.catalog.getLatestVersion(productName, output);
    
    // Read data
    const data = await this.readFromStorage(version.location);
    
    // Record lineage
    this.recordLineage(productName, output);
    
    return data;
  }
}

// Usage by domain team
const ordersProduct = new DataProduct('./product.yaml');

// Transform and publish
const orders = await ordersProduct.consume('raw-events', 'events_stream');
const transformed = transformOrders(orders);
await ordersProduct.publish('orders_fact', transformed);
```

### 3. Federated Governance

```typescript
// governance/policies/global-policies.yaml
policies:
  - name: pii-encryption
    description: "All PII columns must be encrypted at rest"
    scope: global
    enforcement: blocking
    rule:
      type: schema-check
      condition: |
        FOR column IN schema.columns
        WHERE column.tags CONTAINS 'pii'
        ASSERT column.encryption IS NOT NULL
        
  - name: data-retention
    description: "Data must have retention policy"
    scope: global
    enforcement: warning
    rule:
      type: metadata-check
      condition: |
        ASSERT product.retention_days IS NOT NULL

  - name: schema-compatibility
    description: "Schema changes must be backward compatible"
    scope: global
    enforcement: blocking
    rule:
      type: schema-evolution
      mode: backward-compatible

# Domain-specific policies
domain_policies:
  finance:
    - name: audit-trail
      description: "All financial data must have audit trail"
      enforcement: blocking
```

### 4. Data Product Discovery

```typescript
// catalog/search-service/src/index.ts

interface DataProductMetadata {
  name: string;
  domain: string;
  owner: string;
  outputs: OutputMetadata[];
  quality_score: number;
  usage_stats: UsageStats;
  lineage: LineageGraph;
}

class DataCatalogService {
  // Search data products
  async search(query: SearchQuery): Promise<DataProductMetadata[]> {
    return this.elasticsearch.search({
      index: 'data-products',
      body: {
        query: {
          bool: {
            must: [
              { multi_match: { query: query.text, fields: ['name', 'description', 'tags'] } },
            ],
            filter: [
              query.domain && { term: { domain: query.domain } },
              query.minQuality && { range: { quality_score: { gte: query.minQuality } } },
            ].filter(Boolean),
          },
        },
        sort: [
          { usage_stats.views: 'desc' },
          { quality_score: 'desc' },
        ],
      },
    });
  }
  
  // Get lineage graph
  async getLineage(productName: string): Promise<LineageGraph> {
    const upstream = await this.getUpstreamLineage(productName);
    const downstream = await this.getDownstreamLineage(productName);
    
    return {
      product: productName,
      upstream,
      downstream,
    };
  }
  
  // Quality dashboard
  async getQualityMetrics(productName: string): Promise<QualityMetrics> {
    return {
      currentScore: await this.calculateQualityScore(productName),
      slaCompliance: await this.getSlaCompliance(productName),
      qualityTrend: await this.getQualityTrend(productName, '30d'),
      incidents: await this.getQualityIncidents(productName),
    };
  }
}
```

### 5. Domain Team Implementation

```python
# domains/orders/pipelines/orders_fact.py
from data_platform import DataProduct, DataFrame
from data_platform.quality import expect_column_values_to_not_be_null

product = DataProduct.load("./product.yaml")

@product.pipeline(
    schedule="*/15 * * * *",  # Every 15 minutes
    output="orders_fact"
)
def build_orders_fact():
    # Consume raw events (owned by this domain)
    raw_orders = product.read_source("postgres", "orders")
    raw_items = product.read_source("postgres", "order_items")
    
    # Consume from other domains
    customers = product.consume("customers-data-product", "customers_dim")
    products = product.consume("products-data-product", "products_dim")
    
    # Transform
    orders_fact = (
        raw_orders
        .join(raw_items.groupBy("order_id").agg(sum("quantity"), sum("price")))
        .join(customers, "customer_id")
        .join(products, "product_id")
        .select(
            "order_id",
            "customer_id",
            "customer_segment",  # from customers domain
            "product_category",   # from products domain
            "total_quantity",
            "total_amount",
            "order_status",
            "created_at",
        )
    )
    
    return orders_fact
```

## Quick Start

1. **Define your domain:**
   - Identify bounded context
   - Determine data ownership
   - Define data products

2. **Create product.yaml:**
   ```yaml
   name: my-data-product
   domain: my-domain
   owner: my-team@company.com
   outputs:
     - name: my_table
       type: table
   ```

3. **Implement pipeline:**
   ```python
   @product.pipeline(output="my_table")
   def build():
       return transform(source_data)
   ```

4. **Register in catalog:**
   ```bash
   data-platform register ./product.yaml
   ```

5. **Monitor quality:**
   - View in data portal
   - Set up alerts

## Production Checklist

- [ ] Data product definition complete
- [ ] SLAs defined (freshness, availability)
- [ ] Quality rules implemented
- [ ] Schema documented
- [ ] PII columns tagged
- [ ] Access policies configured
- [ ] Lineage tracked
- [ ] Monitoring dashboards
- [ ] On-call rotation defined

## Anti-patterns

1. **Central Data Team Bottleneck**: Domain teams must own their data products
2. **No Quality SLAs**: Every data product needs measurable SLAs
3. **Missing Discoverability**: Data products must be searchable
4. **Ignoring Governance**: Federated doesn't mean no governance

## Integration Points

- **Platform**: dbt, Airflow, Dagster, Spark
- **Catalog**: DataHub, Amundsen, OpenMetadata
- **Quality**: Great Expectations, Soda, dbt tests
- **Governance**: Apache Atlas, Collibra

## Further Reading

- [Data Mesh Principles](https://martinfowler.com/articles/data-mesh-principles.html)
- [Data Mesh Book](https://www.oreilly.com/library/view/data-mesh/9781492092384/)
- [How to Move Beyond a Monolithic Data Lake](https://martinfowler.com/articles/data-monolith-to-mesh.html)
