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

    application.factory('SearchDatabaseAPI', ['$http', 'filters', function ($http, filters) {

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
                    $('[data-toggle="tooltip"]').tooltip({
                        container: 'body'
                    });
                    applySelectTheme();
                });
            }]
        }
    });


    application.directive('search', function () {
        return {
            restrict: 'E',
            controller: ['$scope', '$sce', '$log', 'SearchDatabaseAPI', 'notify', function ($scope, $sce, $log, SearchDatabaseAPI, notify) {

                var loading = false;
                var search = false;
                var found = false;


                $scope.search = function () {
                    search = true;
                    loading = true;
                    found = true;
                    var searchPromise = SearchDatabaseAPI.search();
                    searchPromise.then(function (searchResults) {
                        if (searchResults.data.results.length > 0) {
                            searchResultsTable(searchResults.data);
                            angular.forEach(searchResults.data.warnings, function(warning) {
                                notify.info('Search', warning);
                            })
                        } else {
                            found = false;
                        }
                        loading = false;
                    }, function(error) {
                        $log.error(error);
                        notify.error('Search', error.data.message);
                    })
                };

                $scope.isFound = function() {
                    return found;
                };

                $scope.isLoading = function () {
                    return loading;
                };

                $scope.isSearch = function () {
                    return search;
                };

                function searchResultsTable(data) {
                    var results = [];
                    angular.forEach(data.results, function (searchResult) {
                        var entries = [];
                        angular.forEach(searchResult.row.entries, function (entry) {
                            entries.push(entry.value)
                        });
                        results.push(entries);
                    });

                    var d3Place = d3.select(".results-table");
                        d3Place.html("");
                    var table = d3Place.append("table")
                        .attr("id", "results-table")
                        .attr("class", "table table-hover compact");

                    var columns = [];
                    var referenceIdTarget = 0;

                    angular.forEach(data.columns, function(column, index) {
                        if (column.name === 'comment') {
                            referenceIdTarget = index;
                            columns.push({
                                data: null,
                                title: column.metadata.title,
                                visible: true,
                                orderable: false,
                                defaultContent: '',
                                className: 'comments-control'

                            })
                        } else {
                            columns.push({
                                data: index,
                                title: column.metadata.title,
                                visible: (function () {
                                    return column.metadata.implicit == -0
                                }())
                            })
                        }
                    });

                    var dataTable = $('#results-table').DataTable({
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
                                targets: -2,
                                render: function (data) {
                                    if (data.indexOf('PMID') >= 0) {
                                        var id = data.substring(5, data.length);
                                        return 'PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                                    } else if (data.indexOf('http') >= 0) {
                                        var domain;
                                        //find & remove protocol (http, ftp, etc.) and get domain
                                        if (data.indexOf("://") > -1) {
                                            domain = data.split('/')[2];
                                        } else {
                                            domain = data.split('/')[0];
                                        }
                                        //find & remove port number
                                        domain = domain.split(':')[0];
                                        return '<a href="' + data  + '">' + domain + '</a>'
                                    } else {
                                        return data;
                                    }
                                }
                            },
                            {
                                targets: -1,
                                render: function(data, type, row) {
                                    try {
                                        var comment = JSON.parse(data[referenceIdTarget]);
                                        var text = "";
                                        angular.forEach(comment, function (value, key) {
                                            text += '<p>' + key + ' : ' + value + '</p>';
                                        });
                                        return '<i class="fa fa-info-circle comments-control" tab-index="0" data-trigger="hover" data-toggle="popover" data-placement="left" title="Additional info" data-content="' + text + '"></i>'
                                    } catch (e) {
                                        return ''
                                    }
                                }
                            }
                        ],
                        drawCallback: function() {
                            $('[data-toggle="popover"]').popover({
                                container: 'body',
                                html: true
                            });
                        }
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