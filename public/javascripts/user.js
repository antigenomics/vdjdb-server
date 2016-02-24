(function() {
    var application = angular.module('user', ['notifications']);

    application.factory('user', ['$http', 'notify', function($http, notify) {
        var user = {
            files: []
        };

        $http.get('/api/userinfo')
            .success(function(userInfo) {
                angular.extend(user, userInfo);
            })
            .error(function(error) {
                //TODO
                console.log(error);
            });

        function deleteFile(file) {
            $http.post('/api/delete', { fileName: file.fileName, action: 'delete' })
                .success(function(response) {
                    var index = user.files.indexOf(file);
                    if (index >= 0) user.files.splice(index, 1);
                    notify.success('Delete', response.message)
                })
                .error(function(response) {
                    notify.error('Delete', response.message);
                });
        }

        function deleteAllFiles() {
            $http.post('/api/delete', { fileName: '', action: 'deleteAll'})
                .success(function(response) {
                    user.files.splice(0, user.files.length)
                    notify.success('Delete', response.message)
                })
                .error(function(response) {
                    notify.error('Delete', response.message);
                });
        }

        function getUser() {
            return user;
        }

        function getFiles() {
            return user.files;
        }

        return {
            getUser: getUser,
            getFiles: getFiles,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles
        }
    }])
}());