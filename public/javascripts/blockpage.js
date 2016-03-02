/**
 * Created by bvdmitri on 02.03.16.
 */

(function() {
    var application = angular.module('blockPage', []);

    application.factory('blockPageFactory', function() {

        var _message = "Initializing";
        var _blocked = true;

        function getMessage() {
            return _message;
        }

        function isBlocked() {
            return _blocked;
        }

        function setMessage(message) {
            _message = message;
        }

        function block() {
            _blocked = true;
        }

        function unblock() {
            _blocked = false;
        }

        return {
            getMessage: getMessage,
            setMessage: setMessage,
            isBlocked: isBlocked,
            block: block,
            unblock: unblock
        }
    });

    application.directive('block', function() {
        return {
            restrict: 'E',
            template:
            '<div class="block-page" ng-show="isBlocked()">' +
                '<div class="background"></div>' +
                '<div class="info">' +
                    '<div class="text-info">' +
                        '<text>{{ message() }}</text>' +
                    '</div>' +
                '</div>' +
            '</div>',
            controller: ['$scope', 'blockPageFactory', function ($scope, blockPageFactory) {
                $scope.isBlocked = blockPageFactory.isBlocked;
                $scope.message = blockPageFactory.getMessage;

            }]
        }
    })
}());
