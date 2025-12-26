# Evidence: cloud-standards-service

These commands validate that the service + BFF routing work end-to-end.

## 1) Health/Ready

```bash
curl -sS http://localhost:5133/api/health
curl -sS http://localhost:5133/api/ready
curl -sS http://localhost:5125/api/v1/standards/sets
```

## 2) Create a set (admin)

```bash
	curl -sS -X POST "http://localhost:5125/api/v1/standards/sets" \
	  -H "content-type: application/json" \
	  -H "authorization: Bearer $TOKEN" \
	  -d '{
	    "name":"Cobb500 Growth Reference",
	    "setType":"REFERENCE",
	    "standardSchemaCode":"GROWTH",
	    "speciesCode":"chicken",
	    "geneticLineCode":"COBB500",
	    "unitSystem":"METRIC",
	    "sex":"AS_HATCHED",
	    "scope":"GLOBAL",
	    "versionTag":"v2022"
	  }'
```

## 3) CSV import (dryRun)

```bash
	curl -sS -X POST "http://localhost:5125/api/v1/standards/imports/csv" \
	  -H "authorization: Bearer $TOKEN" \
	  -F "standardSchemaCode=GROWTH" \
	  -F "speciesCode=chicken" \
	  -F "geneticLineCode=COBB500" \
	  -F "setType=REFERENCE" \
	  -F "scope=TENANT" \
	  -F "unitSystem=METRIC" \
	  -F "sex=AS_HATCHED" \
	  -F "versionTag=v1" \
	  -F "dryRun=true" \
	  -F "tenantId=00000000-0000-4000-8000-000000000001" \
	  -F "file=@./template_growth.csv;type=text/csv"
```

## 4) Resolve precedence

	```bash
	curl -sS "http://localhost:5125/api/v1/standards/resolve?tenantId=00000000-0000-4000-8000-000000000001&speciesCode=chicken&geneticLineCode=COBB500&standardSchemaCode=GROWTH"
	```
