/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import fetchProductsMcp from './fetchProductList.js';
import wineProducts from './mock/products.js';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Handle different endpoints
		if (path === '/products') {
			const response = await fetchProductsMcp();

			// Return the raw product data
			return new Response(JSON.stringify(response), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (path === '/text-data') {
			const response = await fetchProductsMcp();
			// Convert products to text data for vectorization
			const textData = convertProductsToTextData(response.products);
			console.log('🚀 ~ fetch ~ textData:', textData);

			return new Response(JSON.stringify(textData), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (path === '/insert') {
			// Generate embeddings and insert into Vectorize
			try {
				const response = await fetchProductsMcp();

				const textData = convertProductsToTextData(response.products);

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
					returnMetadata: true,
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
		// Get the first variant for pricing and basic info
		const variant = product.variants?.[0] || {};

		// Create a comprehensive text description from all product attributes
		let textDescription = [
			product.title,
			product.wine?.varietal ? `${product.wine.varietal} varietal` : '',
			product.wine?.vintage ? `${product.wine.vintage} vintage` : '',
			product.wine?.countryCode ? `from ${product.wine.countryCode}` : '',
			product.wine?.region ? `${product.wine.region} region` : '',
			product.wine?.appellation ? `${product.wine.appellation} appellation` : '',
			variant.price ? `$${(variant.price / 100).toFixed(2)} price` : '',
			product.wine?.type ? `${product.wine.type} wine type` : '',
			product.adminStatus ? `${product.adminStatus} status` : '',
		]
			.filter(Boolean)
			.join('. ');

		// Add taste profile if available
		if (product.wine?.tasteProfile) {
			const tasteProfile = product.wine.tasteProfile;
			const tasteText = [
				tasteProfile.body !== null ? `${tasteProfile.body} body` : '',
				tasteProfile.sweetness !== null ? `${tasteProfile.sweetness} sweetness` : '',
				tasteProfile.acidity !== null ? `${tasteProfile.acidity} acidity` : '',
				tasteProfile.tannin !== null ? `${tasteProfile.tannin} tannin` : '',
				tasteProfile.fruitiness !== null ? `${tasteProfile.fruitiness} fruitiness` : '',
			]
				.filter(Boolean)
				.join('. ');

			if (tasteText) {
				textDescription += `. ${tasteText}`;
			}
		}

		return {
			id: product.id,
			text: textDescription,
			metadata: {
				// Core product info
				id: product.id,
				title: product.title,
				type: product.type,
				wineType: product.wine?.type || '', // Red, White, etc.
				varietal: product.wine?.varietal || '',
				vintage: product.wine?.vintage ? String(product.wine.vintage) : '',

				// Taste profile as filterable strings
				tasteBody: product.wine?.tasteProfile?.body ? String(product.wine.tasteProfile.body) : '',
				tasteSweetness: product.wine?.tasteProfile?.sweetness ? String(product.wine.tasteProfile.sweetness) : '',
				tasteAcidity: product.wine?.tasteProfile?.acidity ? String(product.wine.tasteProfile.acidity) : '',
				tasteTannin: product.wine?.tasteProfile?.tannin ? String(product.wine.tasteProfile.tannin) : '',
				tasteFruitiness: product.wine?.tasteProfile?.fruitiness ? String(product.wine.tasteProfile.fruitiness) : '',

				// Useful for recommendations
				priceRange: variant.price ? getPriceRange(variant.price / 100) : 'unknown',
				price: variant.price ? String(variant.price / 100) : '',
				region: product.wine?.region || '',
				appellation: product.wine?.appellation || '',
				searchableText: textDescription.toLowerCase(),
				sku: variant.sku || '',
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
