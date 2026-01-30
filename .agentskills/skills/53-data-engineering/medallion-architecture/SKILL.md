---
name: Medallion Architecture
description: Multi-hop data architecture with Bronze, Silver, and Gold layers for progressive data refinement in lakehouses.
---

# Medallion Architecture

## Overview

Medallion Architecture เป็น data design pattern ที่จัดระเบียบ data ใน lakehouse เป็น 3 layers: Bronze (raw), Silver (cleaned), Gold (business-ready) แต่ละ layer เพิ่ม quality และ structure ให้กับ data ทำให้ง่ายต่อการ debug และ reprocess

## Why This Matters

- **Data Quality**: Progressive refinement ensures high-quality outputs
- **Debuggability**: Raw data preserved for troubleshooting
- **Reprocessing**: Can rebuild downstream from any layer
- **Governance**: Clear lineage from source to consumption

---

## Core Concepts

### 1. Bronze Layer (Raw)

```python
# bronze/ingest_orders.py
from pyspark.sql import SparkSession
from delta import DeltaTable

spark = SparkSession.builder.getOrCreate()

def ingest_orders_to_bronze():
    """
    Bronze Layer Rules:
    - Raw data exactly as received
    - Add metadata: source, ingestion time
    - No transformations or filtering
    - Append-only (preserve history)
    """
    
    # Read from source
    raw_df = (
        spark.read
        .format("kafka")
        .option("kafka.bootstrap.servers", "kafka:9092")
        .option("subscribe", "orders")
        .load()
    )
    
    # Add ingestion metadata
    bronze_df = (
        raw_df
        .withColumn("_ingested_at", current_timestamp())
        .withColumn("_source", lit("kafka:orders"))
        .withColumn("_source_file", input_file_name())
        .withColumn("_raw_payload", col("value").cast("string"))
    )
    
    # Write to Bronze (append-only)
    (
        bronze_df.write
        .format("delta")
        .mode("append")
        .partitionBy("_ingested_date")
        .save("/lakehouse/bronze/orders")
    )

# Schema for Bronze
bronze_schema = """
    key BINARY,
    value BINARY,
    topic STRING,
    partition INT,
    offset LONG,
    timestamp TIMESTAMP,
    _ingested_at TIMESTAMP,
    _source STRING,
    _raw_payload STRING
"""
```

### 2. Silver Layer (Cleaned)

```python
# silver/process_orders.py

def process_orders_to_silver():
    """
    Silver Layer Rules:
    - Parse and validate data
    - Apply schema enforcement
    - Deduplicate records
    - Handle data quality issues
    - Type casting and normalization
    """
    
    # Read from Bronze
    bronze_df = spark.read.format("delta").load("/lakehouse/bronze/orders")
    
    # Parse JSON payload
    parsed_df = (
        bronze_df
        .withColumn("parsed", from_json(col("_raw_payload"), order_schema))
        .select(
            col("parsed.order_id").alias("order_id"),
            col("parsed.customer_id").alias("customer_id"),
            col("parsed.items").alias("items"),
            col("parsed.total_amount").cast("decimal(10,2)").alias("total_amount"),
            col("parsed.status").alias("status"),
            to_timestamp(col("parsed.created_at")).alias("created_at"),
            col("_ingested_at"),
            col("_source"),
        )
    )
    
    # Data quality checks
    valid_df = (
        parsed_df
        .filter(col("order_id").isNotNull())
        .filter(col("total_amount") >= 0)
        .filter(col("status").isin(["pending", "confirmed", "shipped", "delivered", "cancelled"]))
    )
    
    # Quarantine bad records
    invalid_df = parsed_df.subtract(valid_df)
    invalid_df.write.format("delta").mode("append").save("/lakehouse/quarantine/orders")
    
    # Deduplicate (keep latest)
    deduped_df = (
        valid_df
        .withWatermark("_ingested_at", "1 hour")
        .dropDuplicates(["order_id"])
    )
    
    # Write to Silver (merge/upsert)
    if DeltaTable.isDeltaTable(spark, "/lakehouse/silver/orders"):
        delta_table = DeltaTable.forPath(spark, "/lakehouse/silver/orders")
        (
            delta_table.alias("target")
            .merge(deduped_df.alias("source"), "target.order_id = source.order_id")
            .whenMatchedUpdateAll()
            .whenNotMatchedInsertAll()
            .execute()
        )
    else:
        deduped_df.write.format("delta").save("/lakehouse/silver/orders")

# Silver schema (enforced)
order_schema = StructType([
    StructField("order_id", StringType(), False),
    StructField("customer_id", StringType(), False),
    StructField("items", ArrayType(StructType([
        StructField("product_id", StringType()),
        StructField("quantity", IntegerType()),
        StructField("price", DecimalType(10, 2)),
    ]))),
    StructField("total_amount", DecimalType(10, 2), False),
    StructField("status", StringType(), False),
    StructField("created_at", TimestampType(), False),
])
```

### 3. Gold Layer (Business-Ready)

```python
# gold/orders_daily_summary.py

def build_orders_daily_summary():
    """
    Gold Layer Rules:
    - Business-level aggregations
    - Optimized for specific use cases
    - Denormalized for query performance
    - Business terminology and metrics
    """
    
    # Read from Silver
    orders = spark.read.format("delta").load("/lakehouse/silver/orders")
    customers = spark.read.format("delta").load("/lakehouse/silver/customers")
    products = spark.read.format("delta").load("/lakehouse/silver/products")
    
    # Build daily summary
    daily_summary = (
        orders
        .join(customers, "customer_id")
        .withColumn("order_date", to_date("created_at"))
        .groupBy("order_date", "customer_segment", "region")
        .agg(
            count("order_id").alias("total_orders"),
            sum("total_amount").alias("total_revenue"),
            avg("total_amount").alias("avg_order_value"),
            countDistinct("customer_id").alias("unique_customers"),
            sum(when(col("status") == "cancelled", 1).otherwise(0)).alias("cancelled_orders"),
        )
        .withColumn("cancellation_rate", 
            col("cancelled_orders") / col("total_orders"))
        .withColumn("_updated_at", current_timestamp())
    )
    
    # Write to Gold (overwrite partition)
    (
        daily_summary.write
        .format("delta")
        .mode("overwrite")
        .option("replaceWhere", f"order_date >= '{start_date}'")
        .partitionBy("order_date")
        .save("/lakehouse/gold/orders_daily_summary")
    )

# Gold: Customer 360
def build_customer_360():
    """Customer-centric view combining all touchpoints"""
    
    orders = spark.read.format("delta").load("/lakehouse/silver/orders")
    customers = spark.read.format("delta").load("/lakehouse/silver/customers")
    support_tickets = spark.read.format("delta").load("/lakehouse/silver/support_tickets")
    
    customer_360 = (
        customers
        .join(
            orders.groupBy("customer_id").agg(
                count("order_id").alias("total_orders"),
                sum("total_amount").alias("lifetime_value"),
                max("created_at").alias("last_order_date"),
                min("created_at").alias("first_order_date"),
            ),
            "customer_id",
            "left"
        )
        .join(
            support_tickets.groupBy("customer_id").agg(
                count("ticket_id").alias("total_tickets"),
                avg("satisfaction_score").alias("avg_satisfaction"),
            ),
            "customer_id",
            "left"
        )
        .withColumn("customer_tenure_days",
            datediff(current_date(), col("first_order_date")))
        .withColumn("days_since_last_order",
            datediff(current_date(), col("last_order_date")))
    )
    
    customer_360.write.format("delta").mode("overwrite").save("/lakehouse/gold/customer_360")
```

### 4. Data Quality Framework

```python
# quality/expectations.py
from great_expectations.core import ExpectationSuite

# Bronze expectations (minimal)
bronze_expectations = ExpectationSuite("bronze_orders")
bronze_expectations.add_expectation(
    expect_column_to_exist("_raw_payload")
)
bronze_expectations.add_expectation(
    expect_column_to_exist("_ingested_at")
)

# Silver expectations (strict)
silver_expectations = ExpectationSuite("silver_orders")
silver_expectations.add_expectation(
    expect_column_values_to_not_be_null("order_id")
)
silver_expectations.add_expectation(
    expect_column_values_to_be_unique("order_id")
)
silver_expectations.add_expectation(
    expect_column_values_to_be_in_set("status", 
        ["pending", "confirmed", "shipped", "delivered", "cancelled"])
)
silver_expectations.add_expectation(
    expect_column_values_to_be_between("total_amount", 0, 1000000)
)

# Gold expectations (business rules)
gold_expectations = ExpectationSuite("gold_orders_summary")
gold_expectations.add_expectation(
    expect_column_values_to_be_between("cancellation_rate", 0, 1)
)
gold_expectations.add_expectation(
    expect_table_row_count_to_be_between(min_value=1)  # Never empty
)
```

### 5. Pipeline Orchestration

```python
# dags/medallion_pipeline.py
from airflow import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator

with DAG(
    "medallion_orders_pipeline",
    schedule_interval="*/15 * * * *",
    catchup=False,
) as dag:
    
    bronze = DatabricksRunNowOperator(
        task_id="bronze_ingest",
        job_id=BRONZE_JOB_ID,
    )
    
    silver = DatabricksRunNowOperator(
        task_id="silver_process",
        job_id=SILVER_JOB_ID,
    )
    
    gold_summary = DatabricksRunNowOperator(
        task_id="gold_daily_summary",
        job_id=GOLD_SUMMARY_JOB_ID,
    )
    
    gold_360 = DatabricksRunNowOperator(
        task_id="gold_customer_360",
        job_id=GOLD_360_JOB_ID,
    )
    
    bronze >> silver >> [gold_summary, gold_360]
```

## Quick Start

1. **Set up lakehouse storage:**
   ```
   /lakehouse/
   ├── bronze/     # Raw data
   ├── silver/     # Cleaned data
   ├── gold/       # Business data
   └── quarantine/ # Bad records
   ```

2. **Create Bronze ingestion job**

3. **Create Silver processing job with quality checks**

4. **Create Gold aggregation jobs**

5. **Orchestrate with Airflow/Dagster**

## Production Checklist

- [ ] Bronze: Append-only, no transformations
- [ ] Bronze: Metadata columns added
- [ ] Silver: Schema enforced
- [ ] Silver: Deduplication logic
- [ ] Silver: Quarantine for bad records
- [ ] Gold: Optimized for query patterns
- [ ] Quality checks at each layer
- [ ] Lineage tracking enabled
- [ ] Time travel/versioning enabled
- [ ] Partition strategy defined

## Anti-patterns

1. **Transforming in Bronze**: Keep Bronze raw
2. **Skipping Silver**: Don't go Bronze → Gold directly
3. **One Giant Gold Table**: Build fit-for-purpose Gold tables
4. **No Quality Gates**: Enforce quality at each transition

## Integration Points

- **Storage**: Delta Lake, Apache Iceberg, Apache Hudi
- **Compute**: Spark, Databricks, Snowflake
- **Orchestration**: Airflow, Dagster, Prefect
- **Quality**: Great Expectations, dbt tests

## Further Reading

- [Databricks Medallion Architecture](https://www.databricks.com/glossary/medallion-architecture)
- [Delta Lake Documentation](https://docs.delta.io/)
- [Building the Lakehouse](https://www.databricks.com/product/data-lakehouse)
