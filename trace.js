'use strict';

function logString(paramString, argString) {
    return '\n\\^[[0;34m' + paramString + ':\\^[[0m ' + argString
}

var trace = function () {
    var methods = {}

    function defaultArgsPrint(params, args) {
        var log = ''
        for (var i = 0; i < params.length; i++) {
            log += logString(params[i], (new ObjC.Object(args[i + 2])).toString())
        }
        return log
    }

    function defaultRetvPrint(retv) {
        return logString('[]', (new ObjC.Object(retv)).toString())
    }

    function hook(method) {
        Interceptor.attach(method.address, {
            onEnter: function (args) {
                var pre = ''
                for (var i = 0; i < this.depth; i++) pre = '│' + pre
                var methodType = method.name.match(/[+-]/)[0]
                var className = method.name.match(/\[(.*?) /)[1]
                var methodName = method.name.match(/ (.*?)\]/)[1]
                var log = pre + '┌ \\^[[0;34m' + methodType + '\\^[[0m[\\^[[0;36m' + className + ' \\^[[0;34m' + methodName + '\\^[[0m]' + '\\^[[0;33m (F:\\^[[0m ' + DebugSymbol.fromAddress(this.returnAddress) + '\\^[[0;33m )'
                if (method.logArgs && method.name.indexOf(':') !== -1) {
                    var params = method.name.split(':]')[0].split(':')
                    params[0] = params[0].split(' ')[1]
                    log += method.argsPrint(params, args)
                }
                log += '\nBacktrace:\n\t' + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n\t')
                send(log.replace(/\n/g, '\n\\^[[0;33m' + pre + '│\\^[[0m '))
            },
            onLeave: function (retval) {
                var pre = ''
                for (var i = 0; i < this.depth; i++) pre = '│' + pre
                var log = pre + '└ \\^[[0;35m' + method.name + '\\^[[0m'
                if (method.logRetv) log += method.retvPrint(retval)
                send(log.replace(/\n/g, '\n\\^[[0;33m' + pre + ' \\^[[0m '))
            }
        })
    }

    return {
        add: function (pattern, logArgs, logRetv, argsPrint, retvPrint) {
            logArgs = logArgs || false
            logRetv = logRetv || false
            argsPrint = argsPrint || defaultArgsPrint
            retvPrint = retvPrint || defaultRetvPrint
            var resolver = new ApiResolver('objc')
            var matches = resolver.enumerateMatches(pattern)
            matches.forEach(function (match) {
                if (!methods[match.name]) methods[match.name] = {}
                Object.assign(methods[match.name], match, {
                    logArgs: logArgs,
                    logRetv: logRetv,
                    argsPrint: argsPrint,
                    retvPrint: retvPrint
                })
            })
        },
        del: function (pattern) {
            var resolver = new ApiResolver('objc')
            var matches = resolver.enumerateMatches(pattern)
            matches.forEach(function (match) {
                try {
                    delete methods[match.name]
                } catch (error) { }
            })
        },
        start: function () {
            for (var key in methods) if (methods.hasOwnProperty(key)) {
                var method = methods[key]
                var log = 'Hook: \\^[[0;34m' + method.name + ' \\^[[0m' + method.address
                if (method.logArgs) log += ' \\^[[0;33m(A)'
                if (method.logRetv) log += ' \\^[[0;33m(R)'
                send(log)
                hook(method)
            }
        }
    }
}()

// trace.add('')

trace.start()
