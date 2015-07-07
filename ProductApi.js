var q = require('q');
var request = require('superagent');

/*
 * @return ProductApi
 *
 * @param settings - required object to configure the module
 * @param settings.host - host domain to use
 * @param settings.isServer - running on server or client
 * @param settings.preview - preview environment
 * @param settings.site - site code (aplha not numeric)
 * @param settings.version - api version
 */
module.exports = function ProductApi(settings) {
    var self = this,
        moduleName = '[ProductApi] ';

    if (typeof settings !== 'object') {
        throw moduleName + 'must be initialized with a settings object';
    }

    if (!settings.host || !settings.site) {
        throw moduleName + 'missing required properties for host and/or site';
    }

    var config = {
        debug: settings.debug || false,
        host: settings.host,
        isServer: settings.isServer || typeof window === 'undefined',
        preview: settings.preview || false,
        site: settings.site,
        version: settings.version || 1
    };

    // routes
    var brandRoute =   '/brands',
        catRoute =     '/categories',
        facetRoute =   '/facets',
        productRoute = '/products',
        qParam =       '?q=',
        queriesRoute = '/queries',
        ruleRoute =    '/rules',
        suggestRoute = '/suggestions';
    
    // id placeholders
    var brandId =    '/{{brandId}}',
        categoryId = '/{{categoryId}}',
        id =         '/{{id}}',
        productId =  '/{{productId}}',
        queryId =    '{{query}}';

    // helper methods
    var helpers = {
        apiCall: function(method, url, params) {
            var corsRetry = !config.isServer,
                deferred = q.defer(),
                isGet = method.toLowerCase() === 'get',
                dataMethod = isGet ? 'query' : 'send',
                msg;

            if (!config.isServer && !isGet) {
                msg = 'client only supports GET methods';
                deferred.reject('Error: ' + msg);
                if (config.debug) {
                    console.warn(moduleName + msg);
                }
                return deferred.promise;
            }

            (function ajax() {
                var operator,
                    paramString,
                    xdr;

                if (config.isServer || !window.XDomainRequest) {
                    request(method, url)[dataMethod](params)
                        .end(function(err, res) {
                            if (corsRetry && err) {
                                corsRetry = false;
                                url = url.replace(config.host, '');

                                return ajax(this);
                            } else if (err) {
                                deferred.reject(err);
                            } else {
                                deferred.resolve(res.body);
                            }
                        });
                } else {
                    // suport IE cross domain
                    xdr = new XDomainRequest();
                    operator = url.indexOf('?') > -1 ? '&' : '?';
                    paramString = '';

                    for (var key in params) {
                        paramString += key + '+' + encodeURIComponent(params[key]);
                    }

                    xdr.onload = function() {
                        xdr.responseText && deferred.resolve(JSON.parse(xdr.responseText)) || deferred.resolve;
                    };

                    xdr.onerror = function(jqXHR, textStatus, errorThrown) {
                        if (corsRetry) {
                            corsRetry = false;
                            url = url.replace(config.host, '');
                            return ajax(this);
                        } else {
                            deferred.reject(errorThrown);
                        }
                    };

                    xdr.open('GET', url + operator + paramString);
                    xdr.send();
                }
            }());

            return deferred.promise;
        },
        buildOptions: function(defaults, options) {
            options = typeof options === 'object' ? options : {};
            options.site = config.site;
            options.preview = config.preview;

            for (var key in defaults) {
                options[key] = options[key] || defaults[key];
            }

            return options;
        },
        getConfig: function() {
            return config;
        },
        processRequest: function(endpoint, request, options) {
            if (typeof request !== 'object') {
                throw moduleName + 'request for ' + endpoint.tpl + ' must be an object';
            }

            var params = helpers.buildOptions(endpoint.opt, options),
                url = '//' + config.host + '/v' + config.version + this.template(endpoint.tpl, request),
                method = endpoint.method || 'GET';

            return this.apiCall(method, url, params);
        },
        setDebug: function(value) {
            config.debug = value;
        },
        setHost: function(value) {
            config.host = value;
        },
        setPreview: function(value) {
            config.preview = value;
        },
        template: function(template, data) {
            var key, reg;

            for (key in data) {
                reg = new RegExp('{{' + key + '}}', 'g');
                template = template.replace(reg, data[key]);
            }

            return template;
        }
    };

    // generic endpoint constructor
    var setEndpoint = self.setEndpoint = function(name, endpoint, override) {
        if (!endpoint && !endpoint.tpl) {
            throw moduleName + 'endpoint needs a template';
        }

        if (!self[name] || override) {
            self[name] = function(request, options) {
                return helpers.processRequest(endpoint, request, options);
            };
            return true;
        } else {
            throw moduleName + 'endpoint ' + name + ' already exists';
        }
    };

    // sugggestions
    setEndpoint('suggestAll', {
        tpl: suggestRoute + qParam + queryId
    });

    // queries
    setEndpoint('suggestQueries', {
        opt: { limit: 8 },
        tpl: queriesRoute + suggestRoute + qParam + queryId
    });

    // products
    setEndpoint('findProducts', {
        tpl: productRoute + productId
    });

    setEndpoint('suggestProducts', {
        opt: { limit: 8 },
        tpl: productRoute + suggestRoute + qParam + queryId
    });

    setEndpoint('searchProducts', {
        opt: {
            limit: 40
        },
        tpl: productRoute + qParam + queryId
    });

    setEndpoint('browseCategory', {
        tpl: catRoute + categoryId + productRoute
    });

    setEndpoint('browseBrandCategory', {
        opt: { limit: 40 },
        tpl: brandRoute + brandId + catRoute + categoryId + productRoute
    });

    setEndpoint('findProductGenerations', {
        tpl: productRoute + productId + '/generations'
    });

    setEndpoint('findSimilarProducts', {
        tpl: productRoute + productId + '/similar'
    });

    setEndpoint('findCrossSellProducts', {
        opt: { limit: 8 },
        tpl: productRoute + productId + '/recommendations'
    });

    // categories
    setEndpoint('suggestCategories', {
        tpl: catRoute + suggestRoute + qParam + queryId
    });

    setEndpoint('findCategory', {
        opt: { limit: 8 },
        tpl: catRoute + categoryId
    });

    setEndpoint('categoryTaxonomy', {
        opt: {
            fields: 'id,name,childCategories',
            maxLevels: 1,
            maxChildren: -1,
            outlet: false
        },
        tpl: catRoute
    });

    setEndpoint('findCategoryBrands', {
        tpl: catRoute + categoryId + brandRoute
    });

    // brands
    setEndpoint('findBrands', {
        opt: { limit: 8 },
        tpl: brandRoute + brandId
    });

    setEndpoint('findBrandCategories', {
        opt: {
            fields: 'id,name,childCategories',
            maxLevels: 1,
            maxChildren: -1,
            outlet: false
        },
        tpl: brandRoute + brandId + catRoute
    });

    setEndpoint('suggestBrands', {
        opt: { limit: 8 },
        tpl: brandRoute + suggestRoute + qParam + queryId
    });

    setEndpoint('allBrands', {
        opt: {
            limit: 2000
        },
        tpl: brandRoute
    });

    // rules
    setEndpoint('findRules', {
        tpl: ruleRoute + id
    });

    // facets
    setEndpoint('findFacets', {
        tpl: facetRoute + id
    });

    setEndpoint('createFacet', {
        method: 'PUT',
        tpl: facetRoute + id
    });

    // expose helpers for testing
    if (config.debug) {
        self.helpers = helpers;
    } else {
        delete self.setEndpoint;
    }
};
