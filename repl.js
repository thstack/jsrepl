(function() {
  var BASE_PATH, EventEmitter, JSREPL, Loader, SANDBOX_SRC, Sandbox, UA, script_element, workerSupported,
    slice = [].slice,
    bind1 = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  script_element = document.getElementById('jsrepl-script');

  if (script_element != null) {
    BASE_PATH = script_element.src.split('/').slice(0, -1).join('/');
    SANDBOX_SRC = BASE_PATH + "/sandbox.html";
  } else {
    throw new Error('JSREPL script element cannot be found. Make sure you have the ID "jsrepl-script" on it.');
  }

  Loader = (function() {
    function Loader() {
      var loadfn;
      loadfn = (function(_this) {
        return function() {
          _this.head = document.getElementsByTagName('head')[0];
          return _this.body = document.getElementsByTagName('body')[0];
        };
      })(this);
      loadfn();
      this.loadfns = [loadfn];
      window.onload = (function(_this) {
        return function() {
          var fn, j, len, ref, results;
          ref = _this.loadfns;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            fn = ref[j];
            results.push(fn());
          }
          return results;
        };
      })(this);
      this.iframe = null;
    }

    Loader.prototype._appendChild = function(tag, elem) {
      var fn;
      fn = (function(_this) {
        return function() {
          return _this[tag].appendChild(elem);
        };
      })(this);
      if (this[tag] != null) {
        return fn();
      } else {
        return this.loadfns.push(fn);
      }
    };

    Loader.prototype.createSandbox = function(callback) {
      if (this.iframe != null) {
        this.body.removeChild(this.iframe);
      }
      this.iframe = document.createElement('iframe');
      this.iframe.src = SANDBOX_SRC;
      this.iframe.style.display = 'none';
      this.iframe.onload = (function(_this) {
        return function() {
          return callback(_this.iframe.contentWindow);
        };
      })(this);
      return this._appendChild('body', this.iframe);
    };

    return Loader;

  })();

  EventEmitter = (function() {
    function EventEmitter() {
      this.listeners = {};
    }

    EventEmitter.prototype.makeArray = function(obj) {
      if (Object.prototype.toString.call(obj) !== '[object Array]') {
        obj = [obj];
      }
      return obj;
    };

    EventEmitter.prototype.on = function(types, fn) {
      var j, len, results, type;
      if (typeof fn !== 'function') {
        return;
      }
      types = this.makeArray(types);
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        if (this.listeners[type] == null) {
          results.push(this.listeners[type] = [fn]);
        } else {
          results.push(this.listeners[type].push(fn));
        }
      }
      return results;
    };

    EventEmitter.prototype.off = function(types, fn) {
      var i, j, len, listeners, results, type;
      types = this.makeArray(types);
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        listeners = this.listeners[type];
        if (listeners == null) {
          continue;
        }
        if (fn != null) {
          i = listeners.indexOf(fn);
          if (i > -1) {
            results.push(listeners.splice(i, 1));
          } else {
            results.push(void 0);
          }
        } else {
          results.push(this.listeners[type] = []);
        }
      }
      return results;
    };

    EventEmitter.prototype.fire = function(type, args) {
      var f, fn, j, len, listeners, ref, results;
      args = this.makeArray(args);
      listeners = this.listeners[type];
      if (listeners == null) {
        return;
      }
      args.push(type);
      ref = (function() {
        var k, len, results1;
        results1 = [];
        for (k = 0, len = listeners.length; k < len; k++) {
          f = listeners[k];
          results1.push(f);
        }
        return results1;
      })();
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        fn = ref[j];
        results.push(fn.apply(this, args));
      }
      return results;
    };

    EventEmitter.prototype.once = function(types, fn) {
      var cb, j, len, results, type;
      types = this.makeArray(types);
      cb = (function(_this) {
        return function() {
          var args, j, len, type;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          for (j = 0, len = types.length; j < len; j++) {
            type = types[j];
            _this.off(type, cb);
          }
          return fn.apply(null, args);
        };
      })(this);
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        results.push(this.on(type, cb));
      }
      return results;
    };

    return EventEmitter;

  })();

  workerSupported = 'Worker' in window;

  Sandbox = (function(superClass) {
    extend(Sandbox, superClass);

    function Sandbox(baseScripts, input_server1, listeners) {
      var fn, path, type;
      this.input_server = input_server1;
      if (listeners == null) {
        listeners = {};
      }
      this.onmsg = bind1(this.onmsg, this);
      this.baseScripts = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = baseScripts.length; j < len; j++) {
          path = baseScripts[j];
          results.push(BASE_PATH + '/' + path);
        }
        return results;
      })();
      this.loader = new Loader;
      for (type in listeners) {
        fn = listeners[type];
        if (typeof fn === 'function') {
          listeners[type] = [fn];
        }
      }
      this.listeners = listeners;
    }

    Sandbox.prototype.onmsg = function(event) {
      var e, error1, msg;
      try {
        msg = JSON.parse(event.data);
        return this.fire(msg.type, [msg.data]);
      } catch (error1) {
        e = error1;
      }
    };

    Sandbox.prototype.load = function(moreScripts, workerFriendly) {
      var allScripts, base, postCreate;
      if (workerFriendly == null) {
        workerFriendly = true;
      }
      allScripts = this.baseScripts.concat(moreScripts);
      base = allScripts.shift();
      if (this.worker != null) {
        this.kill();
      }
      postCreate = (function(_this) {
        return function() {
          _this.post({
            type: 'importScripts',
            data: allScripts
          });
          if (_this.input_server != null) {
            return _this.post({
              type: 'set_input_server',
              data: _this.input_server
            });
          }
        };
      })(this);
      window.removeEventListener('message', this.onmsg, false);
      if (!workerSupported || !workerFriendly) {
        return this.loader.createSandbox((function(_this) {
          return function(sandbox) {
            _this.worker = sandbox;
            _this.workerIsIframe = true;
            window.addEventListener('message', _this.onmsg, false);
            return postCreate();
          };
        })(this));
      } else {
        this.worker = new Worker(base);
        this.workerIsIframe = false;
        this.worker.addEventListener('message', this.onmsg, false);
        return postCreate();
      }
    };

    Sandbox.prototype.post = function(msgObj) {
      var msgStr;
      msgStr = JSON.stringify(msgObj);
      if (!this.workerIsIframe) {
        return this.worker.postMessage(msgStr);
      } else {
        return this.worker.postMessage(msgStr, '*');
      }
    };

    Sandbox.prototype.kill = function() {
      var base1;
      if (typeof (base1 = this.worker).terminate === "function") {
        base1.terminate();
      }
      if ((this.loader.body != null) && this.loader.iframe) {
        this.loader.body.removeChild(this.loader.iframe);
        return delete this.loader['iframe'];
      }
    };

    return Sandbox;

  })(EventEmitter);

  UA = (function() {
    var UA_REGEXS, ua, ua_regex;
    UA_REGEXS = {
      firefox_3: /firefox\/3/i,
      opera: /opera/i,
      chrome: /chrome/i
    };
    for (ua in UA_REGEXS) {
      ua_regex = UA_REGEXS[ua];
      if (ua_regex.test(window.navigator.userAgent)) {
        return ua;
      }
    }
  })();

  JSREPL = (function(superClass) {
    extend(JSREPL, superClass);

    function JSREPL(arg) {
      var baseScripts, db, error, input, input_server, output, progress, ref, result;
      ref = arg != null ? arg : {}, result = ref.result, error = ref.error, input = ref.input, output = ref.output, progress = ref.progress, this.timeout = ref.timeout, input_server = ref.input_server;
      this.getLangConfig = bind1(this.getLangConfig, this);
      this.rawEval = bind1(this.rawEval, this);
      this["eval"] = bind1(this["eval"], this);
      this.checkLineEnd = bind1(this.checkLineEnd, this);
      this.loadLanguage = bind1(this.loadLanguage, this);
      this.off = bind1(this.off, this);
      this.on = bind1(this.on, this);
      JSREPL.__super__.constructor.call(this);
      if (window.openDatabase != null) {
        db = openDatabase('replit_input', '1.0', 'Emscripted input', 1024);
        db.transaction(function(tx) {
          tx.executeSql('DROP TABLE IF EXISTS input');
          return tx.executeSql('CREATE TABLE input (text)');
        });
      }
      if (input_server == null) {
        input_server = {};
      }
      input_server.input_id = Math.floor(Math.random() * 9007199254740992) + 1;
      this.lang = null;
      this.on('input', input);
      baseScripts = ['sandbox.js'];
      if (!window.__BAKED_JSREPL_BUILD__) {
        baseScripts = baseScripts.concat(['util/polyfills.js', 'util/mtwister.js']);
      }
      this.sandbox = new Sandbox(baseScripts, input_server, {
        output: output,
        input: (function(_this) {
          return function() {
            return _this.fire('input', function(data) {
              return _this.sandbox.post({
                type: 'input.write',
                data: data
              });
            });
          };
        })(this),
        error: error,
        result: result,
        progress: progress,
        db_input: (function(_this) {
          return function() {
            return _this.fire('input', function(data) {
              _this.sandbox.fire('recieved_input', [data]);
              return db.transaction(function(tx) {
                return tx.executeSql("INSERT INTO input (text) VALUES ('" + data + "')", []);
              });
            });
          };
        })(this),
        server_input: (function(_this) {
          return function() {
            return _this.fire('input', function(data) {
              var url, xhr;
              _this.sandbox.fire('recieved_input', [data]);
              url = (input_server.url || '/emscripten/input/') + input_server.input_id;
              if (input_server.cors) {
                xhr = new XMLHttpRequest();
                if ('withCredentials' in xhr) {
                  xhr.open('POST', url, true);
                } else if (typeof XDomainRequest !== "undefined" && XDomainRequest !== null) {
                  xhr = new XDomainRequest();
                  xhr.open('POST', url);
                } else {
                  throw new Error('CORS not supported on your browser');
                }
              } else {
                xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
              }
              return xhr.send("input=" + data);
            });
          };
        })(this)
      });
    }

    JSREPL.prototype.on = function(types, fn) {
      var j, len, results, type;
      types = this.makeArray(types);
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        if (type === 'input') {
          results.push(JSREPL.__super__.on.call(this, 'input', fn));
        } else {
          results.push(this.sandbox.on(type, fn));
        }
      }
      return results;
    };

    JSREPL.prototype.off = function(types, fn) {
      var j, len, results, type;
      types = this.makeArray(types);
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        if (type === 'input') {
          results.push(JSREPL.__super__.off.call(this, 'input', fn));
        } else {
          results.push(this.sandbox.off(type, fn));
        }
      }
      return results;
    };

    JSREPL.prototype.loadLanguage = function(lang_name, loadInWorker, callback) {
      var lang_scripts, ref, script;
      if (typeof loadInWorker === 'function') {
        ref = [loadInWorker, void 0], callback = ref[0], loadInWorker = ref[1];
      }
      if (JSREPL.prototype.Languages.prototype[lang_name] == null) {
        throw new Error("Language " + lang_name + " not supported.");
      }
      this.current_lang_name = lang_name;
      this.lang = JSREPL.prototype.Languages.prototype[lang_name];
      if (callback != null) {
        this.sandbox.once('ready', callback);
      }
      lang_scripts = (function() {
        var j, len, ref1, results;
        ref1 = this.lang.scripts;
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          script = ref1[j];
          if (typeof script === 'object') {
            results.push(script[UA] || script['default']);
          } else {
            results.push(script);
          }
        }
        return results;
      }).call(this);
      return this.sandbox.load(lang_scripts.concat([this.lang.engine]), loadInWorker);
    };

    JSREPL.prototype.checkLineEnd = function(command, callback) {
      if (/\n\s*$/.test(command)) {
        return callback(false);
      } else {
        this.sandbox.once('indent', callback);
        return this.sandbox.post({
          type: 'getNextLineIndent',
          data: command
        });
      }
    };

    JSREPL.prototype["eval"] = function(command, callback) {
      var bind, cb, listener, t, unbind;
      if (!this.sandbox.workerIsIframe && (this.timeout != null) && this.timeout.time && this.timeout.callback) {
        t = null;
        cb = (function(_this) {
          return function() {
            var a;
            _this.sandbox.fire('timeout');
            a = _this.timeout.callback();
            if (!a) {
              return t = setTimeout(cb, _this.timeout.time);
            } else {
              return unbind();
            }
          };
        })(this);
        t = setTimeout(cb, this.timeout.time);
        listener = (function(_this) {
          return function() {
            var args, j, type;
            args = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), type = arguments[j++];
            clearTimeout(t);
            if (type === 'input') {
              _this.once('recieved_input', function() {
                return t = setTimeout(cb, _this.timeout.time);
              });
              return bind();
            }
          };
        })(this);
        bind = (function(_this) {
          return function() {
            return _this.once(['result', 'error', 'input'], listener);
          };
        })(this);
        unbind = (function(_this) {
          return function() {
            return _this.off(['result', 'error', 'input'], listener);
          };
        })(this);
        bind();
      }
      if (typeof callback === 'function') {
        this.once(['result', 'error'], (function(_this) {
          return function() {
            var args, j, type;
            args = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), type = arguments[j++];
            if (type === 'error') {
              return callback(args[0], null);
            } else {
              return callback(null, args[0]);
            }
          };
        })(this));
      }
      return this.sandbox.post({
        type: 'engine.Eval',
        data: command
      });
    };

    JSREPL.prototype.rawEval = function(command) {
      return this.sandbox.post({
        type: 'engine.RawEval',
        data: command
      });
    };

    JSREPL.prototype.getLangConfig = function(lang_name) {
      return JSREPL.prototype.Languages.prototype[lang_name || this.current_lang_name] || null;
    };

    return JSREPL;

  })(EventEmitter);

  JSREPL.prototype.Languages = (function() {
    function Languages() {}

    return Languages;

  })();

  JSREPL.prototype.__test__ = (function() {
    function __test__() {}

    return __test__;

  })();

  JSREPL.prototype.__test__.prototype.Loader = Loader;

  JSREPL.prototype.__test__.prototype.EventEmitter = EventEmitter;

  JSREPL.prototype.__test__.prototype.Sandbox = Sandbox;

  this.JSREPL = JSREPL;

}).call(this);
