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

    app.factory('searching', ['$http', '$log', function($http, $log) {
        var filters = [];
        var availableFields = [];
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
                filters: filters
            })
                .success(function(data) {
                    if (data.length == 0) {
                        noResults = true;
                    } else {
                        searchResultsTable(data, availableFields);
                    }
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

        function getFilters() {
            return filters;
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
            getFilters: getFilters,
            getAvailableFields: getAvailableFields,
            isNoResults: isNoResults
        }
    }]);


    app.directive('search', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'searching', function($scope, searching) {
                $scope.filters = searching.getFilters();

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

function searchResultsTable(data, header) {
    var results = [];
    data.forEach(function(entry) {
        entry["cdrEntries"].forEach(function(row) {
            results.push(row);
        });
    });
    var d3Place = d3.select(".results-table");
        d3Place.html("");
    var table = d3Place.append("table")
        .attr("id", "results-table")
        .attr("class", "table table-hover compact");
    var thead = table.append("thead").append("tr");
    var column = [];
    for (var i = 0; i < header.length; i++) {
        thead.append("th").html(header[i].name);
        column.push({
            data: header[i].db_name
        })
    }

    var dataTable = $('#results-table').dataTable({
        data: results,
        columns: column,
        dom: '<"pull-left"l><"clear">Trtd<"pull-left"i>p',
        responsive: true,
        order: [
            [0, "desc"]
        ],
        iDisplayLength: 50,
        scrollY: "600px",
        columnDefs: [
            {
                targets: 12,
                render: function(data) {
                    var id = data.substring(5, data.length);
                    return 'PBMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                }
            }
        ]
    })

}

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