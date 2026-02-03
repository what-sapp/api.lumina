(async () => {
    const cors = require('cors');
    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    const set = require('./settings');
    const chalk = require('chalk');
    
    // ✅ DEPENDENCIES UNTUK PROXY
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    
    const app = express();
    const PORT = process.env.PORT || 4000;
    
    const logger = {
        info: (message) => console.log(chalk.dim.blue('•') + chalk.dim(' info  - ') + message),
        ready: (message) => console.log(chalk.dim.green('•') + chalk.dim(' ready - ') + message),
        warn: (message) => console.log(chalk.dim.yellow('•') + chalk.dim(' warn  - ') + message),
        error: (message) => console.log(chalk.dim.red('•') + chalk.dim(' error - ') + message),
        event: (message) => console.log(chalk.dim.cyan('•') + chalk.dim(' event - ') + message)
    };
    
    app.set('trust proxy', true);
    app.set('json spaces', 2);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }));
    app.use('/', express.static(path.join(__dirname, 'docs')));
    
    logger.info('Starting server initialization...');
    
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
    
    logger.info('Loading scraper module...');
    global.scraper = new(await require('./lib/scrape.js'))('./lib/scrape_file');
    global.scrape = await scraper.list();
    
    setInterval(async () => {
        try {
            await scraper.load();
        } catch (error) {
            logger.error(`Failed to reload scraper: ${error.message}`);
        }
    }, 2000);
    
    function loadEndpointsFromDirectory(directory, baseRoute = '') {
        let endpoints = [];
        const fullPath = path.join(__dirname, directory);
        
        if (!fs.existsSync(fullPath)) {
            logger.warn(`Directory not found: ${fullPath}`);
            return endpoints;
        }
        
        logger.info(`Scanning directory: ${directory}...`);
        const items = fs.readdirSync(fullPath);
        
        items.forEach(item => {
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                console.log('');
                logger.info(`Found subdirectory: ${item}`);
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
                        
                        logger.ready(`${chalk.green(endpointPath)} ${chalk.dim('(')}${chalk.cyan(category)}${chalk.dim(')')}`);
                    }
                } catch (error) {
                    logger.error(`Failed to load module ${itemPath}: ${error.message}`);
                }
            }
        });
        
        return endpoints;
    }
    
    // ========================================
    // Routes - HTML Pages
    // ========================================
    
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    app.get('/docs', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'docs.html'));
    });
    
    app.get('/contributors', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'contributors.html'));
    });
    
    app.get('/status', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'status.html'));
    });
    
    app.get('/ai', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'ai.html'));
    });
    
    // ========================================
    // API Routes
    // ========================================
    
    logger.info('Loading API endpoints...');
    const allEndpoints = loadEndpointsFromDirectory('api');
    console.log('');
    logger.ready(`Loaded ${allEndpoints.reduce((total, category) => total + category.items.length, 0)} endpoints`);
    
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
    
    // ========================================
    // ✅ AI CHAT PROXY ENDPOINT
    // ========================================
    
    app.post('/api/chat', upload.single('media'), async (req, res) => {
        try {
            logger.info(`AI Chat request - Model: ${req.body.model || 'default'}`);
            
            const formData = new FormData();
            
            // Add text fields
            formData.append('model', req.body.model || 'gemini-2.5-flash-lite');
            formData.append('prompt', req.body.prompt || '');
            formData.append('system_instruction', req.body.system_instruction || 'Kamu neko si jago coding, di setiap pesan wajib ada nama kamunya');
            
            // Add history if exists
            if (req.body.history) {
                formData.append('history', req.body.history);
            }
            
            // Add media if exists
            if (req.file) {
                logger.info(`Image attached: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);
                formData.append('media', req.file.buffer, {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                });
            }
            
            // Forward to Gemini API
            const startTime = Date.now();
            const response = await fetch('https://labs.shannzx.xyz/api/v1/gemmy/chat', {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            });
            
            const duration = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            logger.ready(`AI Chat completed in ${duration}ms - Model: ${data.model_used || 'unknown'}`);
            res.json(data);
            
        } catch (error) {
            logger.error(`Chat proxy error: ${error.message}`);
            res.status(500).json({ 
                status: false, 
                error: error.message,
                details: 'Failed to connect to Gemini API'
            });
        }
    });
    
    // ========================================
    // Error Handlers
    // ========================================
    
    app.use((req, res, next) => {
        logger.info(`404: ${req.method} ${req.path}`);
        res.status(404).sendFile(process.cwd() + '/docs/err/404.html');
    });
    
    app.use((err, req, res, next) => {
        logger.error(`500: ${err.message}`);
        res.status(500).sendFile(process.cwd() + '/docs/err/500.html');
    });
    
    // ========================================
    // Server Start
    // ========================================
    
    app.listen(PORT, () => {
        console.log('');
        logger.ready(`Server started successfully`);
        logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);
        
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            const results = {};
            
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        if (!results[name]) {
                            results[name] = [];
                        }
                        results[name].push(net.address);
                    }
                }
            }
            
            for (const [, addresses] of Object.entries(results)) {
                for (const addr of addresses) {
                    logger.info(`Network: ${chalk.cyan(`http://${addr}:${PORT}`)}`);
                }
            }
        } catch (error) {
            logger.warn(`Cannot detect network interfaces: ${error.message}`);
        }
        
        logger.info(`${chalk.dim('Ready for connections')}`);
    });
    
    module.exports = app;
})();
