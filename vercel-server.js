const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const set = require('./settings');

const app = express();

app.set('trust proxy', true);
app.set('json spaces', 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// Serve static files dari folder public dan docs
app.use('/image', express.static(path.join(__dirname, 'docs', 'image')));
app.use('/err', express.static(path.join(__dirname, 'docs', 'err')));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const statusCode = res.statusCode || 200;
            
            const responseData = {
                status: data.status,
                statusCode: statusCode,
                creator: set.author.toLowerCase(),
                ...data
            };
            
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

// Load scraper
(async () => {
    try {
        global.scraper = new(await require('./lib/scrape.js'))('./lib/scrape_file');
        global.scrape = await scraper.list();
    } catch (error) {
        console.error('Failed to load scraper:', error.message);
    }
})();

function loadEndpointsFromDirectory(directory, baseRoute = '') {
    let endpoints = [];
    const fullPath = path.join(__dirname, directory);
    
    if (!fs.existsSync(fullPath)) {
        return endpoints;
    }
    
    const items = fs.readdirSync(fullPath);
    
    items.forEach(item => {
        const itemPath = path.join(fullPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
            const nestedEndpoints = loadEndpointsFromDirectory(
                path.join(directory, item), 
                `${baseRoute}/${item}`
            );
            endpoints = [...endpoints, ...nestedEndpoints];
        } else if (stats.isFile() && item.endsWith('.js')) {
            try {
                const module = require(itemPath);
                
                if (module && module.run && typeof module.run === 'function') {
                    const endpointName = item.replace('.js', '');
                    const endpointPath = `${baseRoute}/${endpointName}`;
                    
                    app.all(endpointPath, module.run);
                    
                    let fullPathWithParams = endpointPath;
                    if (module.params && module.params.length > 0) {
                        fullPathWithParams += '?' + module.params.map(param => `${param}=`).join('&');
                    }
                    
                    const category = module.category || 'Other';
                    const categoryIndex = endpoints.findIndex(endpoint => endpoint.name === category);
                    
                    if (categoryIndex === -1) {
                        endpoints.push({
                            name: category,
                            items: []
                        });
                    }
                    
                    const categoryObj = endpoints.find(endpoint => endpoint.name === category);
                    
                    const endpointObj = {};
                    endpointObj[module.name || endpointName] = {
                        desc: module.desc || 'No description provided',
                        path: fullPathWithParams
                    };
                    
                    categoryObj.items.push(endpointObj);
                }
            } catch (error) {
                console.error(`Failed to load module ${itemPath}: ${error.message}`);
            }
        }
    });
    
    return endpoints;
}

// Load API endpoints
const allEndpoints = loadEndpointsFromDirectory('api');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/endpoints', (req, res) => {
    const totalEndpoints = allEndpoints.reduce((total, category) => {
        return total + category.items.length;
    }, 0);
    res.json({
        status: true,
        count: totalEndpoints,
        endpoints: allEndpoints
    });
});

app.get('/set', (req, res) => {
    res.json({
        status: true,
        ...set
    });
});

// 404 handler
app.use((req, res, next) => {
    const errorPath = path.join(__dirname, 'docs', 'err', '404.html');
    if (fs.existsSync(errorPath)) {
        res.status(404).sendFile(errorPath);
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

// 500 handler
app.use((err, req, res, next) => {
    console.error(`500: ${err.message}`);
    const errorPath = path.join(__dirname, 'docs', 'err', '500.html');
    if (fs.existsSync(errorPath)) {
        res.status(500).sendFile(errorPath);
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Export untuk Vercel
module.exports = app;
