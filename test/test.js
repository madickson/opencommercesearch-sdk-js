var sinon = require('sinon');
var assert = require('assert');
var _ = require('underscore');
var ProductApi = require('../src/ProductApi');


// globals
var productApi,
    fakeServer,
    defaultSettings;


// setup
beforeEach(function() {
    defaultSettings = {
        debug: true,
        host: 'api.backcountry.com',
        preview: false,
        site: 'bcs'
    };

    productApi = new ProductApi(defaultSettings);
});


// the tests   
describe('create', function() {
    it('should throw exception if wrong settings are passed', function() {
        var noSettings = function() { ProductApi(); },
            wrongSettings = function() { ProductApi(''); },
            emptySettings = function() { ProductApi({}); },
            noSite = function() { ProductApi({ host: defaultSettings.host }); },
            noHost = function() { ProductApi({ site: defaultSettings.debug }); };

        assert.throws(noSettings, 'no settings did not throw an exception');
        assert.throws(wrongSettings, 'wrong settings type did not throw an exception');
        assert.throws(emptySettings, 'empty settings object did not throw an exception');
        assert.throws(noSite, 'empty site did not throw an exception');
        assert.throws(noHost, 'empty host did not throw an exception');
    });

    it('should set the config based on the settings passed', function() {
        var settings = {
                debug: true,
                host: 'a host',
                isServer: 'is it on the server',
                site: 'a site',
                version: 999,
                preview: 'is it preview env'
            },
            api = new ProductApi(settings),
            config = api.helpers.getConfig();

        assert.equal(config.site, settings.site, 'site was not set correctly');
        assert.equal(config.host, settings.host, 'host was not set correctly');
        assert.equal(config.isServer, settings.isServer, 'isServer was not set correctly');
        assert.equal(config.version, settings.version, 'version was not set correctly');
        assert.equal(config.preview, settings.preview, 'preview was not set correctly');
    });

    it('should set the default config when settings are not explicit', function() {
        var defaults = {
                isServer: true,
                preview: false,
                version: 1
            },
            api = new ProductApi(defaultSettings),
            config = api.helpers.getConfig();

        assert.equal(config.isServer, defaults.isServer, 'isServer was not set correctly');
        assert.equal(config.preview, defaults.preview, 'preview was not set correctly');
        assert.equal(config.version, defaults.version, 'version was not set correctly');
    });

    it('should return helpers when debug is true', function() {
        var api = new ProductApi(defaultSettings);

        assert(api.helpers, 'helpers were not returned');
    });

    it('should not return helpers or setEndpoint when debug is false', function() {
        defaultSettings.debug = false;
        var api = new ProductApi(defaultSettings);

        assert(!api.setEndpoint, 'setEndpoint was returned');
        assert(!api.helpers, 'helpers were returned');
    });

    it('should return 21 endpoints', function() {
        defaultSettings.debug = false;
        var api = new ProductApi(defaultSettings);

        assert.equal(_.size(api), 21, 'all endpoints were returned');
    });
});

describe('helpers.template', function() {
    it('should replace tpl keys with the specified data', function() {
        var tpl = '/some/endpoint/{{key1}}/and/{{key2}}';
            result = productApi.helpers.template(tpl, { key1: 'foo', key2: 'bar' });

        assert.equal(result, '/some/endpoint/foo/and/bar', 'template keys were not replaced');
    });
});

describe('helpers.buildOptions', function() {
    var optStatic = {
            site: 'bcs',
            preview: false
        },
        optDefault = {
            a: 'foo',
            b: 'foo'
        },
        optCustom = {
            a: 'bar',
            b: 'baz'
        },
        defaultExpected = _.extend(_.clone(optStatic), optDefault),
        customExpected = _.extend(_.clone(optStatic), optCustom);

    it('should return generic options when none are passed', function() {
        var actual = productApi.helpers.buildOptions({}, {});
        assert.deepEqual(actual, optStatic, 'default options not returned');
    });

    it('should return default options when defaults are passed', function() {
        var actual = productApi.helpers.buildOptions(optDefault, {});
        assert.deepEqual(actual, defaultExpected, 'custom options not returned');
    });

    it('should override default options when custom values are passed', function() {
        var actual = productApi.helpers.buildOptions(optDefault, optCustom);
        assert.deepEqual(actual, customExpected, 'custom options not returned');
    });
});

describe('helpers.getConfig', function() {
    it('should return the config object', function() {
        var config = productApi.helpers.getConfig();

        assert(_.isObject(config), 'config object returned');
        assert.deepEqual(_.keys(config), ['debug','host','isServer','preview','site','version'], 'config keys match');
    });
});

describe('helpers.processRequest', function() {
    it('should generate the correct method/url/params then callApi', function() {
        var apiCall = sinon.stub(productApi.helpers, 'apiCall');

        productApi.helpers.processRequest(
            //endpoint
            { tpl: '/testEndpoint/{{id}}' },
            // request
            { id: 'foo' },
            // options
            { fields: 'id,title,brand' }
        );

        assert(apiCall.called, 'callApi method was not called');
        assert(apiCall.calledWith('GET', '//api.backcountry.com/v1/testEndpoint/foo', { site: 'bcs', preview: false, fields: 'id,title,brand'}), 'callApi method was not called');
        productApi.helpers.apiCall.restore();
    });
});

describe('helpers.apiCall', function() {
    it('should return a promise object', function() {
        var apiCall = productApi.helpers.apiCall('GET', '//api.backcountry.com/200', {
            site: 'bcs',
            preview: false
        });

        assert(!!apiCall.then && !!apiCall.done && !!apiCall.fail, 'is not a promise');
    });

    it('should work');
});

describe('setEndpoint', function() {
    var name = 'myNewEndpoint',
        endpoint = {
            tpl: '/route/foo/{{id}}',
            opt: {
                fields: 'id',
                limit: 999
            }
        };

    it('should add a new endpoint method', function() {
        productApi.setEndpoint(name, endpoint);
        assert(_.isFunction(productApi[name]), 'new endpoint "' + name + '" was created');
    });

    it('should call processRequest and apiCall when used', function() {
        var apiCall = sinon.stub(productApi.helpers, 'apiCall'),
            processRequest = sinon.spy(productApi.helpers, 'processRequest'),
            requestData = { id: 'bar' },
            requestOptions = { foo: 'bar' };

        productApi.setEndpoint(name, endpoint);
        productApi[name](requestData, _.clone(requestOptions));

        assert(processRequest.called, 'processRequest was called');
        assert.deepEqual(processRequest.firstCall.args[0], endpoint, 'processRequest endpoint is correct');
        assert.deepEqual(processRequest.firstCall.args[1], requestData, 'processRequest data is correct');
        assert.deepEqual(processRequest.firstCall.args[2].foo, 'bar', 'processRequest custom params was added');

        productApi.helpers.apiCall.restore();
        productApi.helpers.processRequest.restore();
    });

    it('should not let you overwrite an existing endpoint', function() {
        defaultSettings.debug = false;
        var api = new ProductApi(defaultSettings),
            existingEndpoint = _.first(_.keys(api)),
            setExistingEndpoint = function() {
                productApi.setEndpoint(existingEndpoint, { tpl: 'template' });
            };

        assert.throws(setExistingEndpoint, 'cant overwrite an existing endpoint');
    });
});
