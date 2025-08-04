/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import wineProducts from './mock/products.js';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Handle different endpoints
		if (path === '/products') {
			// Return the raw product data
			return new Response(JSON.stringify(wineProducts), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (path === '/text-data') {
			// Convert products to text data for vectorization
			const textData = convertProductsToTextData(wineProducts);
			return new Response(JSON.stringify(textData), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (path === '/insert') {
			// Generate embeddings and insert into Vectorize
			try {
				const textData = convertProductsToTextData(wineProducts);
				const vectors = await generateEmbeddings(textData, env);

				const inserted = await env.VECTORIZE.upsert(vectors);

				return new Response(JSON.stringify(inserted), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (path === '/query') {
			// Query the vector database
			const query = url.searchParams.get('q') || 'red wine';
			try {
				const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
					text: [query],
				});

				const matches = await env.VECTORIZE.query(queryEmbedding.data[0], {
					topK: 5,
					// returnMetadata: true,
				});

				return new Response(JSON.stringify({ query, matches }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		// Default response with available endpoints
		return new Response(
			JSON.stringify({
				endpoints: {
					'/products': 'Get raw wine product data',
					'/text-data': 'Get wine products converted to text data for vectorization',
					'/insert': 'Generate embeddings and insert into Vectorize',
					'/query?q=red wine': 'Query the vector database (replace with your search term)',
				},
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		);
	},
};

/**
 * Convert wine products to text data for vectorization
 * This creates searchable text descriptions from product metadata
 */
function convertProductsToTextData(products) {
	return products.map((product) => {
		// Create a comprehensive text description from all product attributes
		const textDescription = [
			product.wine_name,
			`${product.type} wine`,
			`${product.varietal} varietal`,
			`${product.vintage} vintage`,
			`from ${product.country}`,
			`${product.region} region`,
			`${product.appellation} appellation`,
			`$${product.price} price`,
			`${product.tasting_profile.body} body`,
			`${product.tasting_profile.sweetness} sweetness`,
			`${product.tasting_profile.acidity} acidity`,
			`${product.tasting_profile.tannin} tannin`,
			`${product.tasting_profile.fruitness} fruitness`,
		].join(' ');

		return {
			id: product.sku,
			text: textDescription,
			metadata: {
				...product,
				// Add additional searchable text fields
				searchableText: textDescription.toLowerCase(),
				priceRange: getPriceRange(product.price),
				regionCountry: `${product.region}, ${product.country}`,
				wineTypeVarietal: `${product.type} ${product.varietal}`,
			},
		};
	});
}

/**
 * Generate embeddings using Workers AI and prepare for Vectorize
 */
async function generateEmbeddings(textData, env) {
	// Extract text content for embedding generation
	const texts = textData.map((item) => item.text);

	// Generate embeddings using Workers AI
	const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
		text: texts,
	});

	// Convert embeddings to Vectorize format
	const vectors = textData.map((item, index) => ({
		id: item.id,
		values: embeddings.data[index],
		metadata: item.metadata,
	}));

	return vectors;
}

/**
 * Helper function to categorize wines by price range
 */
function getPriceRange(price) {
	if (price < 100) return 'budget';
	if (price < 500) return 'mid-range';
	if (price < 1000) return 'premium';
	return 'ultra-premium';
}
