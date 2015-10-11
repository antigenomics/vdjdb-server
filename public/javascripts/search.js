(function() {
    "use strict";
    var app = angular.module('searchPage', []);

    var filterTypes = Object.freeze({
        FUZZY: 'fuzzy',
        MATCH: 'match',
        PATTERN: 'pattern'
    });

    app.factory('token', ['$hhtp', '$log', function($hhtp, $log) {

    }]);

    app.factory('filters', ['$http', '$log', function($http, $log) {
        var filters = [];
        var availableFields = [];

        $http.get('/api/getAvailableFields')
            .success(function(data) {
                angular.copy(data, availableFields);
        });

        function search() {
            $http.post('/api/search', {
                filters: filters,
                token: '78879f71-48c5-4fc5-9e12-3015b7b50dcf'
            })
                .success(function(response) {
                    $log.info(response);
                })
                .error(function(error) {
                    $log.error(error);
                })
        }

        function addFilter() {
            filters.push({
                type: 'match',
                field: 'v',
                value: '',
                match: true,
                distance: 3
            })
        }

        function getFitlers() {
            return filters;
        }

        function getAvailableFields() {
            return availableFields;
        }

        return {
            addFilter: addFilter,
            getFilters: getFitlers,
            getAvailableFields: getAvailableFields,
            search: search
        }
    }]);


    app.directive('search', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function($scope, filters) {
                $scope.filters = filters.getFilters();
                $scope.availableFields = filters.getAvailableFields();
                $scope.addFilter = filters.addFilter;
                $scope.search = filters.search;

                $scope.logFilters = function() {
                    console.log($scope.filters);
                };

                $scope.isFuzzyFilter = function(filter) {
                    return filter.type == filterTypes.FUZZY;
                };

                $scope.isMatchFilter = function() {
                    return filter.type == filterTypes.MATCH;
                };

                $scope.isMatchPattern = function() {
                    return filter.type == filterTypes.PATTERN;
                };
            }]
        }
    })

})();