type SeedInferenceResult = {
  id: string
  image_id: string
  predicted_weight_kg: number
  confidence_score: number
  created_at: string
}

const records: SeedInferenceResult[] = Array.from({ length: 10 }, (_, index) => ({
  id: `inference-${index + 1}`,
  image_id: `image-${index + 1}`,
  predicted_weight_kg: 2.0 + index * 0.1,
  confidence_score: 0.9,
  created_at: new Date(Date.now() - index * 60_000).toISOString(),
}))

console.log(JSON.stringify(records, null, 2))
