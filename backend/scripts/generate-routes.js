/**
 * Generate Routes Catalogue
 * Inspects Express app and outputs a JSON list of all registered routes.
 */
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

function getRoutes(app) {
    const routes = [];

    function print(path, layer) {
        if (layer.route) {
            layer.route.stack.forEach((stackItem) => {
                if (stackItem.method) {
                    routes.push({
                        method: stackItem.method.toUpperCase(),
                        path: path + layer.route.path,
                        middleware: layer.route.stack.map((m) => m.name),
                    });
                }
            });
        } else if (layer.name === 'router' && layer.handle.stack) {
            layer.handle.stack.forEach((stackItem) => {
                print(path + (layer.regexp.source !== '^\\/?$' ? layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^', '').replace('\\', '') : ''), stackItem);
            });
        }
    }

    app._router.stack.forEach((layer) => {
        print('', layer);
    });

    return routes;
}

try {
    console.log('🔍 Scanning Express routes...');
    const routes = getRoutes(app);

    // Clean up paths (remove regex artifacts if any remain)
    const cleanRoutes = routes.map(r => ({
        ...r,
        path: r.path.replace(/\\\//g, '/').replace('(?:\\/(?=$))?', ''),
    }));

    console.log(`✅ Found ${cleanRoutes.length} routes.`);

    const outputPath = path.join(__dirname, '../routes.json');
    fs.writeFileSync(outputPath, JSON.stringify(cleanRoutes, null, 2));
    console.log(`📝 Wrote routes to ${outputPath}`);

    // We need to exit explicitly because app dependencies (like Redis/DB) might keep the process alive
    // But strictly speaking, just requiring app shouldn't connect unless we call something.
    // However, src/app.js might import things that connect.
    process.exit(0);
} catch (error) {
    console.error('❌ Failed to generate routes:', error);
    process.exit(1);
}
