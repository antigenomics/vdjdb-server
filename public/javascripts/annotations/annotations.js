(function() {
    var application = angular.module('annotationsPage', ['user']);

    application.directive('sidebar', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'user', function($scope, userInfo) {
                var user = userInfo.getUser();

                $scope.files = files;
                $scope.isFilesExist = isFilesExist;

                $scope.deleteFile = userInfo.deleteFile;
                $scope.deleteAllFiles = userInfo.deleteAllFiles;


                function files() {
                    return user.files;
                }

                function isFilesExist() {
                    return user.files.length > 0;
                }
            }]
        }
    })
}());
