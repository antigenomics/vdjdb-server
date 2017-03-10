(function() {
    var module = angular.module('notifications', []);

    module.factory('notify', function() {

        var defaultOptions = {
            icon: false,
            mouse_reset: false,
            nonblock: {
                nonblock: true,
                nonblock_opacity: .2
            }
        };

        function success(title, text) {
            notify(title, text, 'success', 3000)
        }

        function error(title, text) {
            notify(title, text, 'error', 3000)
        }

        function info(title, text) {
            notify(title, text, 'info', 1000)
        }

        function notice(title, text) {
            notify(title, text, 'notice', 1000)
        }

        function removeNotifications() {
            PNotify.removeAll();
        }

        function notify(title, text, type, delay) {

            var options = {
                title: title,
                text: text,
                type: type,
                delay: typeof delay != 'undefined' ? delay : 1000
            };
            angular.extend(options, defaultOptions);
            new PNotify(options);
        }

        return {
            success: success,
            error: error,
            info: info,
            notice: notice,
            removeNotifications: removeNotifications
        }

    })
}());


