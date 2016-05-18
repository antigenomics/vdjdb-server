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
            notify(title, text, 'success')
        }

        function error(title, text) {
            notify(title, text, 'error')
        }

        function info(title, text) {
            notify(title, text, 'info')
        }

        function notice(title, text) {
            notify(title, text, 'notice')
        }

        function removeNotifications() {
            PNotify.removeAll();
        }

        function notify(title, text, type) {
            var options = {
                title: title,
                text: text,
                type: type
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


