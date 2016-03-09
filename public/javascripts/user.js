(function() {
    var application = angular.module('user', ['notifications', 'blockPage']);

    application.factory('user', ['$http', 'notify', 'blockPageFactory', function($http, notify, block) {
        var user = {
            files: []
        };

        var uid = 0;

        $http.get('/api/userinfo')
            .success(function(userInfo) {
                angular.forEach(userInfo.files, function(file) {
                    file.nameWithoutExt =  file.fileName.substr(0, file.fileName.lastIndexOf('.')) || file.fileName;
                    file.uid = uid++;
                });
                angular.extend(user, userInfo);
                block.unblock();
            })
            .error(function(error) {
                block.setMessage("Error in initializing");
                block.block();
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
                    user.files.splice(0, user.files.length);
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