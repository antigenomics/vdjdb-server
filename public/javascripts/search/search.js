(function () {
    "use strict";

    var application = angular.module('searchPage', ['notifications']);

    application.factory('LoggerService', ['$log', function ($log) {

        function log(message) {
            $log.info(message)
        }

        function logError(message) {
            $log.error(message)
        }

        return {
            log: log,
            logError: logError
        }
    }]);

    application.factory('AnnotationsServerAPI', ['$http', 'LoggerService', 'filters', 'notify', function ($http, LoggerService, filters, notify) {

        function getDatabase() {
            return $http.get('/annotations/db').then(function (response) {
                return response
            })
        }

        function search() {
            filters.pickFiltersSelectData();
            return $http.post('/search', {
                textFilters: filters.getTextFilters(),
                sequenceFilters: filters.getSequenceFilters()
            }).then(function (response) {
                return response
            })
        }

        return {
            getDatabase: getDatabase,
            search: search
        }
    }]);

    application.factory('filters', function () {
        var textFilters = [];
        var sequenceFilters = [];
        var textFilterIndex = 0;
        var sequenceFilterIndex = 0;

        var textFiltersColumns = Object.freeze([
            {dbName: 'cdr3', clientName: 'CDR3'},
            {dbName: 'v.segm', clientName: 'V Segment'},
            {dbName: 'j.segm', clientName: 'J Segment'},
            {dbName: 'gene', clientName: 'Gene'},
            {dbName: 'species', clientName: 'Species'},
            {dbName: 'mhc.a', clientName: 'mhc.a'},
            {dbName: 'mhc.b', clientName: 'mhc.b'},
            {dbName: 'mhc.type', clientName: 'mhc.type'},
            {dbName: 'antigen', clientName: 'Antigen'},
            {dbName: 'antigen.gene', clientName: 'Antigen.Gene'},
            {dbName: 'antigen.species', clientName: 'Antigen.Species'},
            {dbName: 'method', clientName: 'Method'},
            {dbName: 'reference', clientName: 'Reference'},
            {dbName: 'reference.id', clientName: 'Reference.Id'}
        ]);

        var textFiltersTypes = Object.freeze([
            {dbName: 'substring', clientName: 'Substring'},
            {dbName: 'exact', clientName: 'Exact'},
            {dbName: 'pattern', clientName: 'Pattern'},
            {dbName: 'value', clientName: 'Value'}
        ]);

        var sequenceFiltersColumns = Object.freeze([
            { dbName: 'cdr3', clientName: 'CDR3' },
            { dbName: 'antigen', clientName: 'Antigen' }
        ]);

        function pickFiltersSelectData() {
            angular.forEach(textFilters, function (filter) {
                var list = document.getElementsByClassName(filter.filterId);
                angular.forEach(list, function (el) {
                    filter[el.name] = el.value;
                });
            });
            angular.forEach(sequenceFilters, function (filter) {
                var list = document.getElementsByClassName(filter.filterId);
                angular.forEach(list, function (el) {
                    filter[el.name] = el.value;
                });
            })
        }

        function getTextFiltersColumns() {
            return textFiltersColumns;
        }

        function getTextFiltersTypes() {
            return textFiltersTypes;
        }

        function getTextFilters() {
            return textFilters;
        }

        function addTextFilter() {
            textFilters.push({
                filterId: 'text_filter_' + textFilterIndex++,
                columnId: '',
                value: '',
                filterType: '',
                negative: false
            });
        }

        function deleteTextFilter(filter) {
            var index = textFilters.indexOf(filter);
            if (index >= 0) textFilters.splice(index, 1);
        }

        function getSequenceFiltersColumns() {
            return sequenceFiltersColumns;
        }

        function getSequenceFilters() {
            return sequenceFilters;
        }

        function addSequenceFilter() {
            sequenceFilters.push({
                filterId: 'sequence_filter_' + sequenceFilterIndex++,
                columnId: '',
                query: '',
                mismatches: 2,
                insertions: 1,
                deletions: 1,
                mutations: 2,
                depth: -1
            });
        }

        function deleteSequenceFilter(filter) {
            var index = sequenceFilters.indexOf(filter);
            if (index >= 0) sequenceFilters.splice(index, 1);
        }

        return {
            getTextFiltersColumns: getTextFiltersColumns,
            getTextFiltersTypes: getTextFiltersTypes,
            getTextFilters: getTextFilters,
            addTextFilter: addTextFilter,
            deleteTextFilter: deleteTextFilter,
            getSequenceFiltersColumns: getSequenceFiltersColumns,
            getSequenceFilters: getSequenceFilters,
            addSequenceFilter: addSequenceFilter,
            deleteSequenceFilter: deleteSequenceFilter,
            pickFiltersSelectData: pickFiltersSelectData
        }
    });

    application.directive('filters', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function ($scope, filters) {

                $scope.textFilters = filters.getTextFilters();
                $scope.textFiltersColumns = filters.getTextFiltersColumns();
                $scope.textFiltersTypes = filters.getTextFiltersTypes();
                $scope.addTextFilter = filters.addTextFilter;
                $scope.deleteTextFilter = filters.deleteTextFilter;

                $scope.isTextFiltersExist = function () {
                    return $scope.textFilters.length > 0;
                };


                $scope.sequenceFilters = filters.getSequenceFilters();
                $scope.sequenceFiltersColumns = filters.getSequenceFiltersColumns();
                $scope.addSequenceFilter = filters.addSequenceFilter;
                $scope.deleteSequenceFilter = filters.deleteSequenceFilter;

                $scope.isSequenceFiltersExist = function() {
                    return $scope.sequenceFilters.length > 0;
                };

                $scope.$on('onRepeatLast', function () {
                    applySelectTheme();
                });
            }]
        }
    });


    application.directive('annotations', function () {
        return {
            restrict: 'E',
            controller: ['$scope', '$sce', 'AnnotationsServerAPI', 'LoggerService', function ($scope, $sce, AnnotationsServerAPI, LoggerService) {

                var skipColumns = ['record.id', 'complex.id'];
                var loading = false;
                var search = false;
                var found = false;


                $scope.database = function () {
                    var databasePromise = AnnotationsServerAPI.getDatabase();
                    databasePromise.then(function (result) {
                        LoggerService.log(result);
                    })
                };

                $scope.search = function () {
                    search = true;
                    loading = true;
                    found = true;
                    var searchPromise = AnnotationsServerAPI.search();
                    searchPromise.then(function (result) {
                        LoggerService.log(result);
                        if (result.data.rows.length > 0) {
                            searchResultsTable(result.data);
                        } else {
                            found = false;
                        }
                        loading = false;
                    })
                };

                $scope.isFound = function() {
                    return found;
                }

                $scope.isLoading = function () {
                    return loading;
                };

                $scope.isSearch = function () {
                    return search;
                };

                function isColumnSkip(column) {
                    return skipColumns.indexOf(column.name) >= 0;
                }

                function isEntrySkip(entry) {
                    return skipColumns.indexOf(entry.column.name) >= 0;
                }

                function searchResultsTable(data) {
                    var results = [];
                    angular.forEach(data.rows, function (row) {
                        var entries = [];
                        angular.forEach(row.entries, function (entry) {
                            if (!isEntrySkip(entry)) {
                                entries.push(entry.value);
                            }
                        });
                        results.push(entries);
                    });


                    var d3Place = d3.select(".results-table");
                    d3Place.html("");
                    var table = d3Place.append("table")
                        .attr("id", "results-table")
                        .attr("class", "table table-hover compact");
                    var thead = table.append("thead").append("tr");
                    var columns = [];

                    angular.forEach(data.columns, function (column) {
                        if (!isColumnSkip(column)) {
                            thead.append("th").html(column.name);
                            columns.push({
                                title: column.name
                            })
                        }
                    });

                    var dataTable = $('#results-table').dataTable({
                        data: results,
                        columns: columns,
                        dom: '<"pull-left"l><"clear">Trtd<"pull-left"i>p',
                        responsive: true,
                        order: [
                            [0, "desc"]
                        ],
                        iDisplayLength: 50,
                        scrollY: "600px",
                        columnDefs: [
                            {
                                targets: 13,
                                render: function (data) {
                                    var id = data.substring(5, data.length);
                                    return 'PBMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                                }
                            }
                        ]
                    })
                }


            }]
        }
    });


    application.directive('onLastRepeat', function () {
        return function (scope, element, attrs) {
            if (scope.$last) setTimeout(function () {
                scope.$emit('onRepeatLast', element, attrs);
            }, 1);
        };
    });

}());


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