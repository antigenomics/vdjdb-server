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

    application.factory('filters', ['$http', 'notify', function ($http, notify) {
        var textFilters = [];
        var sequenceFilters = [];
        var textFilterIndex = 0;
        var sequenceFilterIndex = 0;

        var loading = true;
        var error = false;

        var textFiltersColumns = [];
        var sequenceFiltersColumns = [];
        
        $http.get('/search/columns')
            .success(function(columns) {
                angular.forEach(columns, function(column) {
                    if (column.metadata.searchable == 1) {
                        if (column.metadata.type === 'txt') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title
                            })
                        } else if (column.metadata.type === 'seq') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title
                            });
                            sequenceFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title
                            })
                        }
                    }
                });
                loading = false;

            })
            .error(function() {
                notify.error('Filters', 'Error while loading filters');
                error = true;
                loading = false;
            });



        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring'},
            { name: 'exact', title: 'Exact'},
            { name: 'pattern', title: 'Pattern'},
            { name: 'value', title: 'Value'}
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

        function isLoaded() {
            return !loading;
        }

        function isError() {
            return error;
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
            pickFiltersSelectData: pickFiltersSelectData,
            isLoaded: isLoaded,
            isError: isError
        }
    }]);

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

                $scope.isLoaded = filters.isLoaded;
                $scope.isError = filters.isError;

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
                var dataTable = null;


                $scope.search = function () {
                    if (!loading) {
                        search = true;
                        loading = true;
                        found = true;
                        var searchPromise = SearchDatabaseAPI.search();
                        searchPromise.then(function (searchResults) {
                            if (searchResults.data.results.length > 0) {
                                if (dataTable != null) dataTable.destroy();
                                dataTable = searchResultsTable(searchResults.data);
                                angular.forEach(searchResults.data.warnings, function(warning) {
                                    notify.info('Search', warning);
                                })
                            } else {
                                found = false;
                            }
                            loading = false;
                        }, function(error) {
                            loading = false;
                            notify.error('Search', error.data.message);
                        })
                    } else {
                        notify.info('Search', 'Loading...')
                    }
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
                            entries.push({
                                meta: entry.column.metadata,
                                value: entry.value
                            })
                        });
                        results.push(entries);
                    });

                    var columns = [];
                    var json = [];
                    angular.forEach(data.columns, function(column, index) {
                        if (column.metadata['data.type'].indexOf('json') >= 0) {
                            json.push(index);
                        }
                        columns.push({
                            data: index,
                            title: column.metadata.title,
                            visible: (function () {
                                return column.metadata.visible == 1
                            }())
                        })
                    });

                    var dataTable = $('#results-table').DataTable({
                        data: results,
                        columns: columns,
                        dom: '<"pull-left"l><"clear">Trtd<"pull-left"i>p',
                        responsive: true,
                        order: [
                            //[0, "desc"]
                        ],
                        iDisplayLength: 50,
                        scrollY: "600px",
                        autoWidth: false,
                        bAutoWidth: false,
                        columnDefs: [
                            {
                                targets: [3,4,5],
                                width: '5%'
                            },
                            {
                                targets: '_all',
                                render: function(data, type, row) {
                                    var value = data.value;
                                    var dataType = data.meta['data.type'];
                                    if (dataType === 'url') {
                                        if (value.indexOf('PMID') >= 0) {
                                            var id = value.substring(5, value.length);
                                            return 'PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                                        } else if (value.indexOf('http') >= 0) {
                                            var domain;
                                            //find & remove protocol (http, ftp, etc.) and get domain
                                            if (value.indexOf("://") > -1) {
                                                domain = value.split('/')[2];
                                            } else {
                                                domain = value.split('/')[0];
                                            }
                                            //find & remove port number
                                            domain = domain.split(':')[0];
                                            return '<a href="' + value  + '">' + domain + '</a>'
                                        } else {
                                            return value;
                                        }
                                    } else if (dataType.indexOf('json') >= 0) {
                                        try {
                                            var comment = JSON.parse(value);
                                            var text = "";
                                            angular.forEach(comment, function (value, key) {
                                                if (value != "")
                                                    text += '<p>' + key + ' : ' + value + '</p>';
                                            });
                                            var color_i = 'black';
                                            if (data.meta['name'] === 'cdr3fix') {
                                                if (comment['fixNeeded'] == false) {
                                                    color_i = '#00a65a';
                                                } else if (comment['good'] == true) {
                                                    color_i = '#f39c12'
                                                } else {
                                                    color_i = '#dd4b39'
                                                }
                                            }
                                            return '<i style="color: ' + color_i + '" class="fa fa-info-circle comments-control" tab-index="0" ' +
                                                'data-trigger="hover" data-toggle="popover" data-placement="left" ' +
                                                'title="Additional info" data-content="' + text + '"></i>'
                                        } catch (e) {
                                            return ''
                                        }
                                    }
                                    return value;
                                }
                            }
                        ],
                        drawCallback: function() {
                            $('[data-toggle="popover"]').popover({
                                container: 'body',
                                html: true
                            });
                        }
                    });

                    return dataTable;
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