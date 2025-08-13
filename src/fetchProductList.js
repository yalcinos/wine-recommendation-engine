/* eslint-disable max-len */
/* eslint-disable no-console */

export default async function fetchProductsMcp() {
	const config = {
		mcp: {
			serverUrl: 'https://4a52dd1bc499.ngrok.app/mcp',
			tenantId: 'development',
		},
	};

	try {
		const payload = {
			jsonrpc: '2.0',
			method: 'tools/call',
			params: {
				name: 'list-filtered-products',
				arguments: {
					tenantId: config.mcp.tenantId,
					page: '1',
					limit: '50',
				},
			},
			id: Date.now(),
		};

		const response = await fetch(config.mcp.serverUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.error) {
			throw new Error(`MCP Error: ${data.error.message}`);
		}

		// Parse products from nested response structure
		let products = [];
		if (data.result?.content?.[0]?.text) {
			products = JSON.parse(data.result.content[0].text);
		}

		return {
			totalItems: products.products.length,
			products: products.products,
		};
	} catch (error) {
		console.error('❌ Failed to fetch products from MCP:', error.message);
		throw error;
	}
}
