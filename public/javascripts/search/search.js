(function () {
    "use strict";

    var application = angular.module('searchPage', ['notifications', 'filters', 'ngWebSocket', 'ui.bootstrap', 'ngClipboard']);

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

    application.factory('SearchDatabaseAPI', ['$http', 'filters', '$websocket', 'notify', 'LoggerService', function ($http, filters, $websocket, notify, LoggerService) {

        var connected = false;
        var connection = $websocket('ws://' + location.host + '/search/connect');
        var defaultSortRule = Object.freeze({
            columnId: 0,
            sortType: 'asc'
        });
        var data = [];
        var pageSize = 100;
        var totalItems = -1;
        var loading = false;
        var pageLoading = false;
        var connectionError = false;
        var sortRule = {
            columnId: defaultSortRule.columnId,
            sortType: defaultSortRule.sortType
        };
        var pingWebSocket = null;
        var columns = [];

        connection.onMessage(function(message) {
            var response = JSON.parse(message.data);
            loading = false;
            pageLoading = false;
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'columns':
                            filters.initialize(response.columns);
                            angular.extend(columns, response.columns);
                            break;
                        case 'search':
                            totalItems = response.totalItems;
                        case 'get_page':
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
                            var complexRow = response.complex;
                            var complexParent = data[response.index];
                            complexRow.complex = true;
                            complexParent.complexFound = true;
                            data.splice(response.index + 1, 0, complexRow);
                            setTimeout(function () {
                                $('.row_popover').popover({
                                    container: 'body',
                                    html: true,
                                    template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                                });
                            }, 100);
                            break;
                        case "export":
                            var elem = document.createElement('a');
                            var link = response.link;
                            var exportType = response.exportType;
                            elem.href = '/search/doc/' + exportType + '/' + link;
                            console.log(elem.href);
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
        });

        connection.onError(function() {
            notify.error('Database', 'Connection error');
            connected = false;
            connectionError = true;
            clearInterval(pingWebSocket);
        });

        connection.onClose(function() {
            notify.error('Database', 'Connection closed');
            connected = false;
            connectionError = true;
            clearInterval(pingWebSocket);
        });

        connection.onOpen(function() {
            LoggerService.log('Connected to the database');
            connected = true;
            loading = false;
            connection.send({
                action: 'columns',
                data: {}
            });
            pingWebSocket = setInterval(function() {
                connection.send({
                    action: 'ping',
                    data: {}
                });
            }, 10000)
        });

        function search() {
            filters.pickFiltersSelectData();
            return $http.post('/search', {
                textFilters: filters.getTextFilters(),
                sequenceFilters: filters.getSequenceFilters()
            }).then(function (response) {
                console.log(response);
                return response
            })
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

        function getPageSize() {
            return pageSize;
        }

        function searchWS() {
            filters.pickFiltersSelectData();
            if (connected && !loading) {
                $("[data-toggle='popover']").popover('destroy');
                loading = true;
                sortRule.columnId = defaultSortRule.columnId;
                sortRule.sortType = defaultSortRule.sortType;
                connection.send({
                    action: 'search',
                    data: filters.getFiltersRequest()
                });
            } else if (loading) {
                notify.info('Search', 'Loading...');
            }
        }

        function changePage(pageV) {
            if (connected && !loading) {
                $("[data-toggle='popover']").popover('destroy');
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

        function sortDatabase(index, page) {
            if (connected && !loading) {
                $("[data-toggle='popover']").popover('destroy');
                pageLoading = true;
                if (sortRule.columnId === index) {
                    sortRule.sortType = sortRule.sortType === 'asc' ? 'desc' : 'asc';
                } else {
                    sortRule.sortType = 'asc';
                }
                sortRule.columnId = index;
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
            if (sortRule.columnId === index && sortRule.sortType === 'asc') return true;
            return false;
        }

        function isColumnDescSorted(index) {
            if (sortRule.columnId === index && sortRule.sortType === 'desc') return true;
            return false;
        }

        function getColumns() {
            return columns;
        }

        function columnByName(columnName) {
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].name === columnName) return columns[i];
            }
            return null;
        }

        return {
            search: search,
            searchWS: searchWS,
            sortDatabase: sortDatabase,
            changePageSize: changePageSize,
            getData: getData,
            isDataFound: isDataFound,
            getTotalItems: getTotalItems,
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
            getColumns: getColumns,
            columnByName: columnByName
        }
    }]);

    application.directive('searchWebsocket', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'SearchDatabaseAPI', '$sce', 'notify', function($scope, SearchDatabaseAPI, $sce, notify) {
                var searchStarted  = false;

                $scope.page = {
                    currentPage: 1
                };
                $scope.userPageSize = 100;
                $scope.totalItems = SearchDatabaseAPI.getTotalItems;
                $scope.pageSize = SearchDatabaseAPI.getPageSize;
                $scope.getData = SearchDatabaseAPI.getData;
                $scope.isDataFound = SearchDatabaseAPI.isDataFound;
                $scope.isConnected = SearchDatabaseAPI.isConnected;
                $scope.isConnectionBroken = SearchDatabaseAPI.isConnectionBroken;
                $scope.isPageLoading = SearchDatabaseAPI.isPageLoading;
                $scope.isLoading = SearchDatabaseAPI.isLoading;
                $scope.exportDocument = SearchDatabaseAPI.exportDocument;
                $scope.getColumns = SearchDatabaseAPI.getColumns;
                $scope.isColumnAscSorted = SearchDatabaseAPI.isColumnAscSorted;
                $scope.isColumnDescSorted = SearchDatabaseAPI.isColumnDescSorted;

                $scope.pageChanged = pageChanged;
                $scope.searchWS = search;
                $scope.sortDatabase = sortDatabase;
                $scope.isSearchStarted = isSearchStarted;
                $scope.clickRow = clickRow;
                $scope.entryValue = entryValue;
                $scope.isEntryVisible = isEntryVisible;
                $scope.columnHeader = columnHeader;
                $scope.isColumnVisible = isColumnVisible;
                $scope.isShowPagination = isShowPagination;
                $scope.changePageSize = changePageSize;
                $scope.isComplex = isComplex;
                $scope.isComplexParent = isComplexParent;

                $scope.clipNoFlash = clipNoFlash;
                $scope.copyToClip = copyToClip;
                $scope.copyToClipNotification = copyToClipNotification;

                function isShowPagination() {
                    if (!SearchDatabaseAPI.isDataFound() || SearchDatabaseAPI.isLoading()) return false;
                    return $scope.totalItems() > 0;
                }

                function isSearchStarted() {
                    return searchStarted;
                }

                function search() {
                    $scope.page.currentPage = 1;
                    searchStarted = true;
                    SearchDatabaseAPI.searchWS();
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

                function clickRow(rowIndex, row) {
                    if (row.hasOwnProperty("complex") && row.complex) return;
                    if (row.hasOwnProperty("complexFound") && row.complexFound) {
                        row.complexFound = false;
                        SearchDatabaseAPI.deleteRow(rowIndex + 1);
                        return;
                    }
                    var complexId = row.entries[0].value;
                    var gene = row.entries[1].value;
                    if (complexId != 0) {
                        SearchDatabaseAPI.findComplexes(complexId, gene, rowIndex);
                    } else {
                        notify.notice('Search', 'Complex not found');
                    }
                }

                function isComplex(row) {
                    return row.hasOwnProperty('complex') && row.complex;
                }

                function isComplexParent(row) {
                    return row.hasOwnProperty('complexFound') && row.complexFound;
                }

                function entryValue(entry, entries) {
                    var value = entry.value;
                    var column = SearchDatabaseAPI.columnByName(entry.columnName);
                    var columnMeta = column.metadata;
                    var columnName = column.name;
                    var dataType = columnMeta.dataType;
                    if (columnName === 'cdr3') {
                        var cdr3fix = JSON.parse(entries[entries.length - 2].value);
                        var vend = cdr3fix['vEnd'];
                        var jstart = cdr3fix['jStart'];
                        var vRegion = '', jRegion = '', otherRegion = '';
                        if (vend > 0 && jstart <= 0) {
                            vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                            otherRegion = value.substring(vend, value.length);
                            value = vRegion + otherRegion
                        }
                        if (vend <= 0 && jstart > 0) {
                            jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                            otherRegion = value.substring(0, jstart - 1);
                            value = otherRegion + jRegion;
                        }
                        if (vend > 0 && jstart > 0) {
                            vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                            otherRegion = value.substring(vend, jstart - 1);
                            jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                            value = vRegion + otherRegion + jRegion;
                        }
                    }
                    if (columnName === 'gene') {
                        var prefix = '';
                        if (entries[0].value != 0) {
                            prefix = '<i class="fa cursor_pointer" ng-class="{\'fa-plus\':!isComplexParent(row) && !isComplex(row), \'fa-minus\':isComplexParent(row)}" aria-hidden="true" ' +
                                'ng-click="::clickRow(rowIndex, row)"></i>';
                        } else {
                            prefix = '<i class="fa fa-plus cursor_pointer" style="color: #D3D3D3;" ng-click="::clickRow(rowIndex, row)"></i>'
                        }
                        switch (value) {
                            case 'TRA':
                                value = prefix + '<text class="tra_text_color">' + value + '</text>';
                                break;
                            case 'TRB':
                                value = prefix + '<text class="trb_text_color">' + value + '</text>';
                                break;
                            default:
                        }
                    }
                    if (dataType === 'url') {
                        if (value.indexOf('PMID') >= 0) {
                            var id = value.substring(5, value.length);
                            value = 'PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
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
                            value = '<a href="' + value  + '">' + domain + '</a>'
                        }
                    } else if (dataType.indexOf('json') >= 0) {
                        try {
                            var comment = JSON.parse(value);
                            var text = "";
                            var color_i = 'black';
                            angular.forEach(Object.keys(comment).sort(), function (propertyName) {
                                if (comment[propertyName] !== "")
                                    text += '<p>' + propertyName + ' : ' + comment[propertyName] + '</p>';
                            });
                            if (columnName === 'cdr3fix') {
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
                            value = '<i style="color: ' + color_i + '" class="fa fa-info-circle comments-control row_popover" tab-index="0" ' +
                                'data-trigger="hover" data-toggle="popover" data-placement="left" ' +
                                'title="' + columnMeta.title + '" data-content="' + text + '" clip-copy="copyToClip(\'' + text + '\')"' +
                                'clip-click-fallback="clipNoFlash(\'' + text + '\')" clip-click="copyToClipNotification()"></i>'
                        } catch (e) {
                            value = ''
                        }
                    }
                    return value;
                }

                function isEntryVisible(entry) {
                    return SearchDatabaseAPI.columnByName(entry.columnName).metadata.visible !== "0"
                }

                function columnHeader(column) {
                    return '<text class="column_popover" data-trigger="hover" data-toggle="popover" data-placement="top" data-content="' +
                        column.metadata.comment + '">' + column.metadata.title + '</text>';
                }

                function isColumnVisible(column) {
                    return column.metadata.visible !== "0"
                }

                $scope.$on('onRepeatLast', function(element, a, attrs) {
                    var elem = attrs.onLastRepeat;
                    if (elem === 'row') {
                        $('.row_popover').popover({
                            container: 'body',
                            html: true,
                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                        });
                    } else if (elem === 'column') {
                        $('.column_popover').popover({
                            container: 'body',
                            html: true,
                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to sort</h3></div>'
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
            }, 1);
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