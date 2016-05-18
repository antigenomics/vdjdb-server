(function () {
    "use strict";

    var application = angular.module('searchPage', ['notifications', 'filters']);

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
            console.log(filters.getTextFilters());
            return $http.post('/search', {
                textFilters: filters.getTextFilters(),
                sequenceFilters: filters.getSequenceFilters()
            }).then(function (response) {
                console.log(response);
                return response
            })
        }

        return {
            search: search
        }
    }]);
    
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
                                loadingRef.val = false;
                            }
                        }, function(error) {
                            loadingRef.val = false;
                            notify.error('Search', error.data.message);
                        })
                    } else {
                        notify.info('Search', 'Loading...')
                    }
                };

                $scope.isSearchResultsFound = function() {
                    return found;
                };

                $scope.isSearchResultsLoading = function () {
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
                                            var color_i = 'black';
                                            angular.forEach(Object.keys(comment).sort(), function (propertyName) {
                                                if (value !== "")
                                                    text += '<p>' + propertyName + ' : ' + comment[propertyName] + '</p>';
                                            });
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