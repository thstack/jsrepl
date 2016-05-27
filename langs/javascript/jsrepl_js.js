(function() {
  self.JSREPLEngine = (function() {
    function JSREPLEngine(input, output, result1, error, sandbox, ready) {
      this.result = result1;
      this.error = error;
      this.sandbox = sandbox;
      this.inspect = this.sandbox.console.inspect;
      this.functionClass = this.sandbox.Function;
      this.sandbox.__eval = this.sandbox["eval"];
      ready();
    }

    JSREPLEngine.prototype.Eval = function(command) {
      var e, error, result;
      try {
        result = this.sandbox.__eval(command);
        return this.result(result === void 0 ? '' : this.inspect(result));
      } catch (error) {
        e = error;
        return this.error(e);
      }
    };

    JSREPLEngine.prototype.RawEval = function(command) {
      var e, error, result;
      try {
        result = this.sandbox.__eval(command);
        return this.result(result);
      } catch (error) {
        e = error;
        return this.error(e);
      }
    };

    JSREPLEngine.prototype.GetNextLineIndent = function(command) {
      var e, error;
      try {
        new this.functionClass(command);
        return false;
      } catch (error) {
        e = error;
        if (/[\[\{\(]$/.test(command)) {
          return 1;
        } else {
          return 0;
        }
      }
    };

    return JSREPLEngine;

  })();

}).call(this);
