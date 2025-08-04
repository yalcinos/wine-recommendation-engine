# 🍷 Wine Recommendation AI

AI-powered wine recommendation system using Cloudflare Workers, Vectorize, and Workers AI. Finds similar wines based on natural language queries.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create Vectorize index
npx wrangler vectorize create wine-recommendation-engine --dimensions=768 --metric=cosine

# Login to Cloudflare
npx wrangler login

# Run locally
npm run dev

# Run with remote bindings (recommended for Vectorize/AI locally)
npx wrangler dev --remote

# Deploy
npm run deploy
```

## 📚 Endpoints

### Get All Wines
```
GET /products
```
Returns 30 premium wines with metadata.

### Convert to Text Data
```
GET /text-data
```
Returns wines converted to searchable text for vectorization.

### Insert Vectors
```
POST /insert
```
Generates embeddings and stores in Vectorize.

### Get Recommendations
```
GET /query?q=<search_term>
```

**Examples:**
```bash
curl "http://localhost:8787/query?q=red wine from France"
curl "http://localhost:8787/query?q=premium cabernet sauvignon"
curl "http://localhost:8787/query?q=sparkling champagne"
```

**Response:**
```json
{
  "query": "red wine",
  "matches": {
    "count": 5,
    "matches": [
      {"id": "WINE-012", "score": 0.721},
      {"id": "WINE-010", "score": 0.704}
    ]
  }
}
```

## 🎯 Similarity Scores

- **0.7-0.8**: Excellent recommendations
- **0.6-0.7**: Good alternatives  
- **0.5-0.6**: Moderate similarity
- **Below 0.5**: Less relevant

## 🍷 Wine Database

30 premium wines including:
- **Red Wines**: Bordeaux Grand Cru Red, Napa Valley Reserve, Tuscan Super Red
- **Sparkling**: Champagne Vintage Brut, Champagne Grande Cuvée
- **White Wines**: Bordeaux Sweet White
- **Regions**: Bordeaux, Champagne, Napa Valley, Burgundy
- **Price Range**: $99.99 - $15,999.99

## 🔧 Tech Stack

- **Cloudflare Workers**: Serverless runtime
- **Vectorize**: Vector database for similarity search
- **Workers AI**: BGE model for embeddings
- **Wrangler**: CLI for deployment

## 🧠 How It Works

### 1. **Text Processing**
Wine metadata is converted to searchable text:
```
"Bordeaux Grand Cru Red Red wine Cabernet Sauvignon Blend varietal 2018 vintage from France Bordeaux region Margaux appellation $899.99 price Full body Dry sweetness Medium acidity High tannin Medium fruitness"
```

### 2. **Vector Embeddings**
Workers AI generates 768-dimensional vectors using the BGE model:
- Each wine becomes a numerical vector
- Similar wines have similar vectors
- Enables semantic search beyond exact matches

### 3. **Vector Storage**
Cloudflare Vectorize stores vectors with metadata:
- Fast similarity search
- Cosine distance metric
- Scalable to thousands of wines

### 4. **Query Processing**
User queries are processed the same way:
- Query text → Vector embedding
- Find similar vectors in database
- Return top matches with similarity scores

### 5. **Recommendation Engine**
- **Semantic Understanding**: "red wine from France" finds Bordeaux reds
- **Fuzzy Matching**: "premium cabernet" matches expensive Cabernet Sauvignons
- **Context Awareness**: Considers region, price, tasting notes

## 🧪 Test

```bash
# Insert vectors
curl http://localhost:8787/insert

# Test recommendations
curl "http://localhost:8787/query?q=red wine"
```


### Remote Development (Recommended)
```bash
npx wrangler dev --remote
```
- Connects to real Cloudflare services
- Required for Vectorize and Workers AI
- Slower but more accurate testing
- All bindings use actual remote resources

## 📝 Note
Use `npx wrangler dev --remote` when testing Vectorize and AI features, as local development doesn't support these services.

