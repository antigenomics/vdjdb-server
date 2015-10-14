(function() {
    "use strict";
    var app = angular.module('searchPage', []);

    var filterTypes = Object.freeze({
        FUZZY: 'fuzzy',
        MATCH: 'match',
        PATTERN: 'pattern'
    });

    app.directive('onLastRepeat', function() {
        return function(scope, element, attrs) {
            if (scope.$last) setTimeout(function(){
                scope.$emit('onRepeatLast', element, attrs);
            }, 1);
        };
    });

    app.factory('token', ['$http', '$log', function($http, $log) {

    }]);

    app.factory('searching', ['$http', '$log', function($http, $log) {
        var filters = [];
        var availableFields = [];
        var results = [];
        var noResults = false;

        $http.get('/api/getAvailableFields')
            .success(function(data) {
                angular.forEach(data, function(field) {
                    availableFields.push({
                        name: field[1],
                        db_name: field[0]
                    })
                })
        });

        function search() {
            noResults = false;
            $http.post('/api/search', {
                filters: filters,
                token: token
            })
                .success(function(data) {
                    if (data.length == 0) noResults = true;
                    angular.copy(data, results);
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


        // ---------------------------------------------- //
        // Getters
        // ---------------------------------------------- //

        function getFitlers() {
            return filters;
        }

        function getResults() {
            return results;
        }

        function getAvailableFields() {
            return availableFields;
        }

        function isNoResults() {
            return noResults;
        }

        // ---------------------------------------------- //

        return {
            addFilter: addFilter,
            search: search,
            getFilters: getFitlers,
            getAvailableFields: getAvailableFields,
            getResults: getResults,
            isNoResults: isNoResults
        }
    }]);


    app.directive('search', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'searching', function($scope, searching) {
                $scope.filters = searching.getFilters();
                $scope.results = searching.getResults();

                $scope.availableFields = searching.getAvailableFields();
                $scope.addFilter = searching.addFilter;
                $scope.search = searching.search;
                $scope.isNoResults = searching.isNoResults;

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

function testWatchers() {
    "use strict";
    var root = $(document.getElementsByTagName('body'));
    var watchers = [];

    var f = function (element) {
        if (element.data().hasOwnProperty('$scope')) {
            angular.forEach(element.data().$scope.$$watchers, function (watcher) {
                watchers.push(watcher);
            });
        }

        angular.forEach(element.children(), function (childElement) {
            f($(childElement));
        });
    };

    f(root);

    return watchers.length;
}