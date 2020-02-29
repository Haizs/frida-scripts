import sys
from optparse import OptionParser
from datetime import datetime
import frida


def on_message(message, data):
    if message['type'] == 'error':
        print(datetime.now().strftime('%H:%M:%S.%f')[:-3] + '\033[0;31m[!] ' +
              message['stack'].replace('\n', '\n                 ') + '\033[0m')
    elif message['type'] == 'send':
        print(datetime.now().strftime('%H:%M:%S.%f')[:-3] + ' \033[0;33m[i] ' +
              message['payload'].replace('\\^[', '\033').replace('\n', '\n                 ') + '\033[0m')
    else:
        print(message)


def trace(device, pid, session):
    script = open('./trace.js', 'r')
    source = script.read()
    script = session.create_script(source)
    script.on('message', on_message)
    try:
        script.load()
        try:
            device.resume(pid)
        except:
            pass
        sys.stdin.read()
    except KeyboardInterrupt:
        session.detach()
        print('\033[0;32m[*] Detached from PID: \033[0m ', pid)


def parse_args():
    parser = OptionParser(
        usage='usage: %prog [options] BundleID', version='%prog 0.1')
    parser.add_option('-L', '--local', action='store_true',
                      default=False, help='Connect to local device')
    parser.add_option('-U', '--usb', action='store_true',
                      default=False, help='Connect to USB device')
    parser.add_option('-R', '--remote', action='store',
                      metavar='HOST', help='Connect to remote device')
    (options, args) = parser.parse_args()
    if options.local:
        device = frida.get_local_device()
    elif options.usb:
        device = frida.get_usb_device()
    elif options.remote:
        device = frida.get_device_manager().add_remote_device(options.remote)
    else:
        parser.print_help()
        sys.exit(0)
    if len(args) != 1:
        parser.print_help()
        sys.exit(0)
    return device, args[0]


if __name__ == '__main__':
    try:
        device, bundleid = parse_args()
        print('\033[0;32m[*] Device ID:\033[0m ' + device.id)
        try:
            app = [x for x in device.enumerate_applications() if bundleid ==
                   x.identifier][0]
        except IndexError:
            print('\033[0;31m[!] No such app: ' + bundleid)
            sys.exit(0)
        print('\033[0;32m[*] Application Name:\033[0m ' + app.name)
        pid = app.pid or device.spawn(app.identifier)
        session = device.attach(pid)
        print('\033[0;32m[*] Attached to PID:\033[0m ' + str(pid))

        trace(device, pid, session)

    except KeyboardInterrupt:
        sys.exit(0)
