(function () {
    "use strict";

    var application = angular.module('searchPage', ['notifications', 'filters', 'ngWebSocket', 'ui.bootstrap', 'ngClipboard', 'table']);

    application.config(['ngClipProvider', function(ngClipProvider) {
        ngClipProvider.setPath('/assets/lib/angular/plugins/zeroclipboard/ZeroClipboard.swf');
    }]);

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

    application.factory('SearchDatabaseAPI', ['$websocket', 'filters', 'table', 'notify', 'LoggerService', function ($websocket, filters, table, notify, LoggerService) {
        var searchStarted = false;
        var connected = false;
        var connection = null;
        var defaultSortRule = {
            columnId: 'gene',
            sortType: 'asc'
        };
        var data = [];
        var pageSize = 100;
        var totalItems = -1;
        var numberOfRecordsInDB = -1;
        var loading = false;
        var pageLoading = false;
        var connectionError = false;
        var sortRule = {
            columnId: defaultSortRule.columnId,
            sortType: defaultSortRule.sortType
        };
        var pingWebSocket = null;

        function createWebSocketConnection() {
            pageLoading = true;
            connection = $websocket('ws://' + location.host + '/search/connect');
            connectionError = false;
            sortRule.columnId = defaultSortRule.columnId;
            sortRule.sortType = defaultSortRule.sortType;
            connection.onMessage(connectionOnMessage);
            connection.onError(connectionOnError);
            connection.onClose(connectionOnClose);
            connection.onOpen(connectionOnOpen);
        }

        createWebSocketConnection();

        function connectionOnMessage(message) {
            var response = JSON.parse(message.data);
            loading = false;
            pageLoading = false;
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'init':
                            numberOfRecordsInDB = response.numberOfRecordsInDB;
                            break;
                        case 'search':
                            totalItems = response.totalItems;
                            data.splice(0, data.length);
                            angular.extend(data, response.rows);
                            break;
                        case 'get_page':
                            data.splice(0, data.length);
                            angular.extend(data, response.rows);
                            break;
                        case 'sort':
                            data.splice(0, data.length);
                            angular.extend(data, response.rows);
                            break;
                        case "change_size":
                            pageSize = response.pageSize;
                            if (!response.init) {
                                data.splice(0, data.length);
                                angular.extend(data, response.rows);
                            }
                            break;
                        case "complex":
                            data.splice(response.index + 1, 0, response.complex);
                            var complexParent = data[response.index];
                            complexParent.complexFound = true;

                            var complexRow = data[response.index + 1];
                            complexRow.complex = true;
                            setTimeout(function () {
                                $('.row_popover').popover({
                                    container: 'body',
                                    html: true,
                                    animation: false,
                                    template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                                });
                            }, 100);
                            break;
                        case "export":
                            var elem = document.createElement('a');
                            var link = response.link;
                            var exportType = response.exportType;
                            elem.href = '/search/doc/' + exportType + '/' + link;
                            document.body.appendChild(elem);
                            elem.click();
                            break;
                        default:
                            notify.notice('Search', 'Invalid response');
                            break;
                    }
                    break;
                case 'warn':
                    angular.forEach(response.warnings, function(warning) {
                        notify.notice('Search', warning);
                    });
                    break;
                case 'error':
                    notify.error('Search', response.message);
                    break;
            }
        }

        function connectionOnError() {
            notify.error('Database', 'Connection error');
            connected = false;
            connectionError = true;
            clearInterval(pingWebSocket);
        }

        function connectionOnClose() {
            notify.error('Database', 'Connection closed');
            connected = false;
            connectionError = true;
            clearInterval(pingWebSocket);
        }

        function connectionOnOpen() {
            LoggerService.log('Connected to the database');
            connected = true;
            loading = true;
            sortRule.columnId = defaultSortRule.columnId;
            sortRule.sortType = defaultSortRule.sortType;
            connection.send({
               action: 'init',
               data: {}
            });
            connection.send({
                action: 'search',
                data: filters.getFilters()
            });
            searchStarted = true;
            pingWebSocket = setInterval(function() {
                connection.send({
                    action: 'ping',
                    data: {}
                });
            }, 10000)
        }

        function isSearchStarted() {
            return searchStarted;
        }

        function isConnected() {
            return connected;
        }

        function isConnectionBroken() {
            return connectionError;
        }

        function isLoading() {
            return loading;
        }

        function isPageLoading() {
            return pageLoading;
        }

        function getData() {
            return data;
        }

        function isDataFound() {
            return data.length > 0;
        }

        function getTotalItems() {
            return totalItems;
        }

        function getNumberOfRecordsInDB() {
            return numberOfRecordsInDB;
        }

        function getPageSize() {
            return pageSize;
        }

        function searchWS() {
            if (connected && !loading) {
                if (filters.isValid()) {
                    $(".row_popover").popover('destroy');
                    loading = true;
                    sortRule.columnId = defaultSortRule.columnId;
                    sortRule.sortType = defaultSortRule.sortType;
                    connection.send({
                        action: 'search',
                        data: filters.getFilters()
                    });
                    return true;
                } else {
                    var errors = filters.getErrors();
                    angular.forEach(errors, function(error) {
                        notify.error('Search', error);
                    });
                    return false;
                }
            } else if (loading) {
                notify.info('Search', 'Loading...');
                return false;
            }
            return false;
        }

        function resetFilters() {
            filters.resetFilters();
        }

        function changePage(pageV) {
            if (connected && !loading) {
                $(".row_popover").popover('destroy');
                pageLoading = true;
                connection.send({
                    action: 'get_page',
                    data: {
                        page: pageV
                    }
                })
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function sortDatabase(columnId, page) {
            if (connected && !loading) {
                $(".row_popover").popover('destroy');
                pageLoading = true;
                if (sortRule.columnId === columnId) {
                    sortRule.sortType = sortRule.sortType === 'asc' ? 'desc' : 'asc';
                } else {
                    sortRule.sortType = 'desc';
                }
                sortRule.columnId = columnId;
                connection.send({
                    action: 'sort',
                    data: {
                        page: page,
                        columnId: sortRule.columnId,
                        sortType: sortRule.sortType
                    }
                })
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function changePageSize(newPageSize) {
            if (connected && !loading) {
                pageLoading = true;
                connection.send({
                    action: 'change_size',
                    data: {
                        size: newPageSize,
                        init: !isDataFound()
                    }
                })
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function findComplexes(complexId, gene, index) {
            if (connected && !loading) {
                pageLoading = true;
                connection.send({
                    action: 'complex',
                    data: {
                        complexId: complexId,
                        gene: gene,
                        index: index
                    }
                })
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function exportDocument(exportType) {
            if (connected && !loading) {
                pageLoading = true;
                connection.send({
                    action: 'export',
                    data: {
                        exportType: exportType
                    }
                })
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function deleteRow(dataIndex) {
            data.splice(dataIndex, 1);
        }

        function isColumnAscSorted(index) {
            return sortRule.columnId === index && sortRule.sortType === 'asc';

        }

        function isColumnDescSorted(index) {
            return sortRule.columnId === index && sortRule.sortType === 'desc';
        }

        return {
            searchWS: searchWS,
            resetFilters: resetFilters,
            sortDatabase: sortDatabase,
            changePageSize: changePageSize,
            getData: getData,
            isDataFound: isDataFound,
            isSearchStarted: isSearchStarted,
            getTotalItems: getTotalItems,
            getNumberOfRecordsInDB: getNumberOfRecordsInDB,
            getPageSize: getPageSize,
            changePage: changePage,
            findComplexes: findComplexes,
            exportDocument: exportDocument,
            isConnected: isConnected,
            isConnectionBroken: isConnectionBroken,
            isLoading: isLoading,
            isPageLoading: isPageLoading,
            isColumnAscSorted: isColumnAscSorted,
            isColumnDescSorted: isColumnDescSorted,
            deleteRow: deleteRow,
            createWebSocketConnection: createWebSocketConnection
        }
    }]);

    application.directive('searchWebsocket', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'SearchDatabaseAPI', 'table', 'notify', function($scope, SearchDatabaseAPI, table, notify) {
                $scope.page = {
                    currentPage: 1
                };
                $scope.userPageSize = 100;
                $scope.totalItems = SearchDatabaseAPI.getTotalItems;
                $scope.getNumberOfRecordsInDB = SearchDatabaseAPI.getNumberOfRecordsInDB;
                $scope.pageSize = SearchDatabaseAPI.getPageSize;
                $scope.getData = SearchDatabaseAPI.getData;
                $scope.isDataFound = SearchDatabaseAPI.isDataFound;
                $scope.isConnected = SearchDatabaseAPI.isConnected;
                $scope.isConnectionBroken = SearchDatabaseAPI.isConnectionBroken;
                $scope.isPageLoading = SearchDatabaseAPI.isPageLoading;
                $scope.isLoading = SearchDatabaseAPI.isLoading;
                $scope.exportDocument = SearchDatabaseAPI.exportDocument;
                $scope.isColumnAscSorted = SearchDatabaseAPI.isColumnAscSorted;
                $scope.isColumnDescSorted = SearchDatabaseAPI.isColumnDescSorted;
                $scope.reconnect = function() {
                    $scope.page.currentPage = 1;
                    $scope.userPageSize = 100;
                    SearchDatabaseAPI.createWebSocketConnection();
                };

                $scope.getColumns = table.getColumns;
                $scope.getVisibleColumns = table.getVisibleColumns;
                $scope.entryValue = table.entryValue;
                $scope.isEntryVisible = table.isEntryVisible;
                $scope.columnHeader = table.columnHeader;
                $scope.isColumnVisible = table.isColumnVisible;

                $scope.pageChanged = pageChanged;
                $scope.search = search;
                $scope.reset = reset;
                $scope.sortDatabase = sortDatabase;
                $scope.isSearchStarted = isSearchStarted;
                $scope.clickRow = clickRow;

                $scope.isShowPagination = isShowPagination;
                $scope.changePageSize = changePageSize;
                $scope.selectPageSize = selectPageSize;
                $scope.isComplex = isComplex;
                $scope.isComplexParent = isComplexParent;

                $scope.clipNoFlash = clipNoFlash;
                $scope.copyToClip = copyToClip;
                $scope.copyToClipNotification = copyToClipNotification;

                $scope.reloadRoute = function() {
                    $route.reload();
                };

                function isShowPagination() {
                    if (!SearchDatabaseAPI.isDataFound() || SearchDatabaseAPI.isLoading()) return false;
                    return $scope.totalItems() > 0;
                }

                function isSearchStarted() {
                    return SearchDatabaseAPI.isSearchStarted();
                }

                function search() {
                    $scope.page.currentPage = 1;
                    if (SearchDatabaseAPI.searchWS()) {
                        $('html,body').animate({scrollTop: $(".scroll-down-to").offset().top}, 'slow');
                    }
                }

                function reset() {
                    SearchDatabaseAPI.resetFilters();
                }

                function pageChanged() {
                    SearchDatabaseAPI.changePage($scope.page.currentPage - 1);
                }

                function sortDatabase(index) {
                    SearchDatabaseAPI.sortDatabase(index, $scope.page.currentPage - 1);
                }

                function changePageSize() {
                    $scope.page.currentPage = 1;
                    SearchDatabaseAPI.changePageSize($scope.userPageSize);
                }

                function selectPageSize(size) {
                    $scope.userPageSize = size;
                    changePageSize();
                }

                function clickRow(rowIndex, row) {
                    if (row.hasOwnProperty("complex") && row.complex) return;
                    if (row.hasOwnProperty("complexFound") && row.complexFound) {
                        row.complexFound = false;
                        SearchDatabaseAPI.deleteRow(rowIndex + 1);
                        return;
                    }
                    var complexId = row.entries[0].value;
                    var gene = row.entries[1].value;
                    if (complexId !== '0') {
                        SearchDatabaseAPI.findComplexes(complexId, gene, rowIndex);
                    } else {
                        notify.notice('Search', 'No paired TCR chain was found');
                    }
                }

                function isComplex(row) {
                    return row.hasOwnProperty('complex') && row.complex;
                }

                function isComplexParent(row) {
                    return row.hasOwnProperty('complexFound') && row.complexFound;
                }

                $scope.$on('onRepeatLast', function(element, a, attrs) {
                    var elem = attrs.onLastRepeat;
                    if (elem === 'row') {
                        $('.row_popover').popover({
                            container: 'body',
                            html: true,
                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click  <i style="color:black" class="fa fa-info-circle comments-control"></i>  to copy to clipboard</h3></div>'
                        });
                        $('.row_popover_generic').popover({
                            container: 'body',
                            html: true,
                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div>'
                        });
                    } else if (elem === 'column') {
                        $('.column_popover').popover({
                            container: 'body',
                            html: true,
                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click column header to sort</h3></div>'
                        });
                    }
                });

                function clipNoFlash(text) {
                    var content = text;
                    content = content.replace(/<p>/gm, " ");
                    content = content.replace(/(<([^>]+)>)/ig, "\n");
                    window.prompt("Copy to clipboard: Ctrl+C, Enter\nUse arrows to navigate", content);
                }

                function copyToClip(text) {
                    var content = text;
                    content = content.replace(/<p>/gm, " ");
                    content = content.replace(/(<([^>]+)>)/ig, "\n");
                    return content;
                }

                function copyToClipNotification() {
                    notify.info('Meta information', 'Data has been copied to clipboard');
                }
            }]
        }
    });

    application.directive('onLastRepeat', function () {
        return function (scope, element, attrs) {
            if (scope.$last) setTimeout(function () {
                scope.$emit('onRepeatLast', element, attrs);
            }, 100);
        };
    });

    application.directive('compile', ['$compile', function ($compile) {
        return function(scope, element, attrs) {
            var unregister = scope.$watch(
                function(scope) {
                    return scope.$eval(attrs.compile);
                },
                function(value) {
                    element.html(value);
                    $compile(element.contents())(scope);
                    unregister();
                }
            )};
    }]);

    application.directive('convertToNumber', function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                ngModel.$parsers.push(function(val) {
                    return val ? parseInt(val, 10) : null;
                });
                ngModel.$formatters.push(function(val) {
                    return val ? '' + val : null;
                });
            }
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