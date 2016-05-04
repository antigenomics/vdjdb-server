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
            .success(function(columnsInfo) {
                var columns = columnsInfo.columns;
                angular.forEach(columns, function(columnInfo) {
                    var column = columnInfo.column;
                    if (column.metadata.searchable == 1) {
                        if (column.metadata.type === 'txt') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: (function() {
                                    if (column.metadata['data.type'] === 'uint')
                                        return [3];
                                    return [0, 1, 2]
                                }()),
                                allowNegative: (function() {
                                    return column.metadata['data.type'] !== 'uint';
                                }()),
                                autocomplete: columnInfo.autocomplete,
                                values: columnInfo.values
                            })
                        } else if (column.metadata.type === 'seq') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: [0, 1, 2],
                                allowNegative: true,
                                autocomplete: false,
                                values: []
                            });
                            sequenceFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: [0, 1, 2],
                                allowNegative: true,
                                autocomplete: false,
                                values: []
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
            { name: 'substring', title: 'Substring', allowNegative: true},
            { name: 'exact', title: 'Exact', allowNegative: true},
            { name: 'pattern', title: 'Pattern', allowNegative: true},
            { name: 'level', title: 'Level', allowNegative: false}
        ]);

        function pickFiltersSelectData() {
            angular.forEach(textFilters, function (filter) {
                var list = document.getElementsByClassName(filter.filterId);
                angular.forEach(list, function (el) {
                    filter[el.name] = el.value;
                });
                filter.value = $('#input_'+filter.filterId).val();
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
            if (textFilters.length === 0 || textFilters[textFilters.length - 1].initialized) {
                textFilters.push({
                    index: textFilterIndex,
                    filterId: 'text_filter_' + textFilterIndex++,
                    columnId: 'Please select column name:',
                    columnTitle: 'Please select column name:',
                    value: '',
                    filterType: '',
                    negative: false,
                    allowNegative: true,
                    types: [0, 1, 2, 3],
                    initialized: false
                });
            }
        }

        function copyFilter(f) {
            deleteTextFilter(f);
            var new_f = {
                index: f.index,
                filterId: 'text_filter_' + textFilterIndex++,
                columnId: f.columnId,
                columnTitle: f.columnTitle,
                value: f.value,
                filterType: '',
                negative: f.negative,
                allowNegative: f.allowNegative,
                types: f.types,
                initialized: f.initialized
            };
            textFilters.push(new_f);
            return new_f;
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

        function findFilter(id) {
            for (var i = 0; i < textFilters.length; i++) {
                if (textFilters[i].filterId === id) return textFilters[i];
            }
            return null;
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

        function changeFilterSearchTypes(id, types) {
            textFilters[id].types = types;
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
            isError: isError,
            changeFilterSearchTypes: changeFilterSearchTypes,
            copyFilter: copyFilter,
            findFilter: findFilter
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

                function arraysEqual(a, b) {
                    if (a === b) return true;
                    if (a == null || b == null) return false;
                    if (a.length != b.length) return false;

                    // If you don't care about the order of the elements inside
                    // the array, you should sort both arrays here.

                    for (var i = 0; i < a.length; ++i) {
                        if (a[i] !== b[i]) return false;
                    }
                    return true;
                }

                $scope.$on('onRepeatLast', function () {
                    $('[data-toggle="tooltip"]').tooltip({
                        container: 'body'
                    });
                    applySelectTheme(function(id, name, title) {
                        $scope.$apply(function() {
                            angular.forEach(filters.getTextFiltersColumns(), function (column) {
                                if (column.name === name) {
                                    var filter = filters.findFilter(id);
                                    var filterId = id;
                                    if (!arraysEqual(filter.types, column.types)) {
                                        filter.types = column.types;
                                        filter.columnId = column.name;
                                        filter.columnTitle = column.title;
                                        filter.allowNegative = column.allowNegative;
                                        filter.initialized = true;
                                        //todo not working ?
                                        if (column.allowNegative === false) filter.negative = true;
                                        var new_f = filters.copyFilter(filter);
                                        filterId = new_f.filterId;
                                    }
                                    setTimeout(function() {
                                        $( "#input_" + filterId ).autocomplete({
                                            source: column.values,
                                            minLength: 0
                                        });
                                    }, 100)
                                }
                            });
                        })
                    });
                });
            }]
        }
    });


    application.directive('search', function () {
        return {
            restrict: 'E',
            controller: ['$scope', '$sce', '$log', 'SearchDatabaseAPI', 'notify', function ($scope, $sce, $log, SearchDatabaseAPI, notify) {

                var loadingRef = {
                    val: false
                };
                var search = false;
                var found = false;
                var dataTable = null;


                $scope.search = function () {
                    if (!loadingRef.val) {
                        search = true;
                        loadingRef.val = true;
                        found = true;
                        var searchPromise = SearchDatabaseAPI.search();
                        searchPromise.then(function (searchResults) {
                            if (searchResults.data.results.length > 0) {
                                if (dataTable != null) dataTable.destroy();
                                dataTable = searchResultsTable(searchResults.data, loadingRef);
                                angular.forEach(searchResults.data.warnings, function(warning) {
                                    notify.info('Search', warning);
                                })
                            } else {
                                found = false;
                            }
                        }, function(error) {
                            loadingRef.val = false;
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
                    return loadingRef.val;
                };

                $scope.isSearch = function () {
                    return search;
                };

                function searchResultsTable(data, loadingRef) {
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
                    angular.forEach(data.columns, function(column, index) {
                        var columnHeader = '<text data-trigger="hover" data-toggle="popover" data-placement="top" data-content="' +
                        column.metadata['comment'] + '">' + column.metadata.title +  '</text>';
                        columns.push({
                            data: index,
                            title: columnHeader,
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
                                    if (data.meta.name === 'cdr3') {
                                        var cdr3fix = JSON.parse(row[row.length - 2].value);
                                        var vend = cdr3fix['vEnd'];
                                        var jstart = cdr3fix['jStart'];
                                        if (vend <= 0 && jstart <= 0) return value;
                                        var vRegion = '', jRegion = '', otherRegion = '';
                                        if (vend > 0 && jstart <= 0) {
                                            vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                                            otherRegion = value.substring(vend, value.length);
                                            return vRegion + otherRegion
                                        }
                                        if (vend <= 0 && jstart > 0) {
                                            jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                                            otherRegion = value.substring(0, jstart - 1);
                                            return otherRegion + jRegion;
                                        }
                                        if (vend > 0 && jstart > 0) {
                                            vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                                            otherRegion = value.substring(vend, jstart - 1);
                                            jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                                            return vRegion + otherRegion + jRegion;
                                        }
                                    }
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
                                                if (value !== "")
                                                    text += '<p>' + key + ' : ' + value + '</p>';
                                            });
                                            var color_i = 'black';
                                            if (data.meta['name'] === 'cdr3fix') {
                                                if (comment['fixNeeded'] === false && comment['good'] === true) {
                                                    color_i = '#1a9641';
                                                } else if (comment['fixNeeded'] === false && comment['good'] === false) {
                                                    color_i = '#fdae61'
                                                } else if (comment['fixNeeded'] === true && comment['good'] === true) {
                                                    color_i = '#a6d96a'
                                                } else {
                                                    color_i = '#d7191c'
                                                }
                                            }
                                            return '<i style="color: ' + color_i + '" class="fa fa-info-circle comments-control" tab-index="0" ' +
                                                'data-trigger="hover" data-toggle="popover" data-placement="left" ' +
                                                'title="' + data.meta.title + '" data-content="' + text + '"></i>'
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
                            loadingRef.val = false;
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