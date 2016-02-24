(function() {
    var application = angular.module('user', []);

    application.factory('user', ['$http', function($http) {
        var user = {};

        $http.get('/api/userinfo')
            .success(function(userInfo) {
                angular.extend(user, userInfo);
            })
            .error(function(error) {
                //TODO
                console.log(error);
            });

        function getUser() {
            return user;
        }

        function addFile(file) {
            user.files.push({
                fileName: file.originalFileName
            })
        }

        return {
            getUser: getUser,
            addFile: addFile
        }
    }])
}());