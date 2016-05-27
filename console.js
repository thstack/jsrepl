$(function() {
    // Creating the console.
    var header = 'This is the console.' +
    ' Switch Languages for the relevant interpreters\n';
    promptsym = '';
    jqconsole = $('#javascript-console').jqconsole(header, promptsym);

    editor = ace.edit("javascript-editor");
      editor.setTheme("ace/theme/textmate");
      editor.getSession().setMode("ace/mode/javascript");


    /* Giving meaning to everything written above */
    jsrepl = new JSREPL({
        input: inputCallback,
        output: outputCallback,
        result: resultCallback,
        error: errorCallback,
        progress: progressCallback,
        timeout: {
          time: 30000,
          callback: timeoutCallback
        }
      });

    jsrepl.loadLanguage('javascript', false, function () {
      StartPrompt();
    });

    function Evaluate (command) {
      if (command) {
        jsrepl["eval"](command);
      } else {
        StartPrompt();
      }
    }

    function StartPrompt() {
      jqconsole.Prompt(true, Evaluate, jsrepl.checkLineEnd, true);
    }

    function errorCallback(error) {
      if (typeof error === 'object') {
        error = error.message;
      }
      if (error[-1] !== '\n') {
        error = error + '\n';
      }
      jqconsole.Write(String(error), 'jqconsole-error-output');
      StartPrompt();
    }

    function inputCallback (callback) {
      jqconsole.Input(function(result) {
        try {
          callback(result);
        }
        catch(error) {
          jsrepl.errorCallback(error)
        }
      });
    }

    function outputCallback (output, cls) {
      if (output) {
        jqconsole.Write(output, 'jqconsole-output');
      }
    }

    function resultCallback(result) {
      if (result) {
        if (result[-1] !== '\n') {
          result = result + '\n';
        }
        jqconsole.Write(promptsym + result, 'jqconsole-output');
      }
      StartPrompt(); // TODO
    }

    function timeoutCallback() {
      var a;
      if (a = confirm('The program is taking too long to finish. Do you want to stop it?')) {
        jqconsole.AbortPrompt();
        StartPrompt();
      }
      return a;
    }

    function progressCallback (percentage) {
      // TODO
    }

    $('#run').click(function() {
      Evaluate(editor.getValue());
    });

});
