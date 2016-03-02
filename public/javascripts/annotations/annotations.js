(function() {
    var application = angular.module('annotationsPage', ['user']);

    application.factory('sidebar', ['user', function(userInfo) {
        var user = userInfo.getUser();
        var selectedFile = '';

        function files() {
            return user.files;
        }

        function isFilesExist() {
            return user.files.length > 0;
        }

        function deleteFile(file) {
            userInfo.deleteFile(file);
            if (file === selectedFile) selectedFile = '';
        }

        function deleteAllFiles() {
            userInfo.deleteAllFiles();
            selectedFile = '';
        }

        function select(file) {
            selectedFile = file;
        }

        function getSelectedFile() {
            return selectedFile;
        }

        function isFileSelected() {
            return selectedFile !== '';
        }

        return {
            files: files,
            isFilesExist: isFilesExist,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles,
            select: select,
            getSelectedFile: getSelectedFile,
            isFileSelected: isFileSelected
        }
    }]);

    application.directive('sidebar', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', function($scope, sidebar) {

                $scope.files = sidebar.files;
                $scope.isFilesExist = sidebar.isFilesExist;
                $scope.deleteFile = sidebar.deleteFile;
                $scope.deleteAllFiles = sidebar.deleteAllFiles;
                $scope.select = sidebar.select;


            }]
        }
    });

    application.factory('annotations', ['$http', 'sidebar', function($http, sidebar) {

        function intersect() {
            var file = sidebar.getSelectedFile();
            $http.post('/annotations/intersect', { fileName: file.fileName })
                .success(function(response) {
                    console.log(response);
                })
                .error(function(response) {
                    console.log(response);
                })
        }

        return {
            intersect: intersect
        }
    }]);

    application.directive('annotations', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', 'annotations', function($scope, sidebar, annotations) {
                $scope.isFileSelected = sidebar.isFileSelected;
                $scope.selectedFile = sidebar.getSelectedFile;
                $scope.intersect = annotations.intersect;
            }]
        }
    })
}());
