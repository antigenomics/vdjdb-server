(function() {
    "use strict";

    var branchApplication = angular.module('branchPage', ['user', 'notifications']);

    branchApplication.factory('branch', ['user', '$http', function(user, $http) {

        function createTestBranch() {
            return $http.post('/intersection/branch', { branchName: 'asd' })
                .then(function(response) {
                    return response;
                })
        }

        return {
            createTestBranch: createTestBranch
        }
    }]);

    branchApplication.directive('branch', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'branch', function($scope, branch) {
                $scope.testBranch = function() {
                    var response = branch.createTestBranch();
                    response.then(function(successResponse) {
                        console.log('success');
                        console.log(successResponse);
                    }, function(errorResponse) {
                        console.log('error');
                        console.log(errorResponse);
                    })
                }
            }]
        }
    })
}());