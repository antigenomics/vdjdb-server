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

        connection.onMessage(function(message) {
            var response = JSON.parse(message.data);
            var responseData;
            loading = false;
            pageLoading = false;
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'search':
                            totalItems = response.totalItems;
                        case 'get_page':
                        case 'sort':
                            responseData = JSON.parse(response.rows);
                            data.splice(0, data.length);
                            angular.extend(data, responseData);
                            break;
                        case "change_size":
                            pageSize = response.pageSize;
                            if (!response.init) {
                                responseData = JSON.parse(response.rows);
                                data.splice(0, data.length);
                                angular.extend(data, responseData);
                            }
                            break;
                        case "complex":
                            responseData = JSON.parse(response.rows);
                            var found = false;
                            angular.forEach(responseData, function (d) {
                                if (d.row.entries[1].value !== response.gene) {
                                    d.complex = true;
                                    d.row.entries[1].complex = true;
                                    found = true;
                                    data[response.index].complexFound = true;
                                    data[response.index].row.entries[1].complexFound = true;
                                    data.splice(response.index + 1, 0, d);
                                    setTimeout(function () {
                                        $('.row_popover').popover({
                                            container: 'body',
                                            html: true,
                                            template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                                        });
                                    }, 100)
                                }
                            });
                            if (!found) {
                                notify.notice('Search', 'Complex not found');
                            }
                            break;
                        case "export":
                            var elem = document.createElement('a');
                            var link = response.link;
                            var exportType = response.exportType;
                            elem.href = '/search/doc/' + exportType + '/' + link;
                            //elem.target = '_blank';
                            //elem.style.targetNew = 'new';
                            console.log(elem.href);
                            document.body.appendChild(elem);
                            elem.click();
                            //document.removeChild(elem);
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

        function getMaxPages() {
            return maxPages;
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

        function changePage(page) {
            if (connected && !loading) {
                $("[data-toggle='popover']").popover('destroy');
                pageLoading = true;
                connection.send({
                    action: 'get_page',
                    data: {
                        page: page
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
            deleteRow: deleteRow
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
                                                if (comment[propertyName] !== "")
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
                                html: true,
                                template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                            }).on('click', function(e) {
                                if ($(this).prop('tagName') === 'I') {
                                    var content = $(this).attr('data-content');
                                    content = content.replace(/<p>/gm, " ");
                                    content = content.replace(/(<([^>]+)>)/ig, "\n");
                                    window.prompt('Copy to clipboard: Ctrl+C, Enter\nUse arrows to navigate', content);
                                }
                                e.preventDefault();
                            });
                            loadingRef.val = false;
                        }
                    });

                    return dataTable;
                }


            }]
        }
    });

    application.directive('searchWebsocket', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'SearchDatabaseAPI', '$sce', 'notify', function($scope, SearchDatabaseAPI, $sce, notify) {
                var searchStarted  = false;

                $scope.page = 1;
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

                $scope.isColumnAscSorted = SearchDatabaseAPI.isColumnAscSorted;
                $scope.isColumnDescSorted = SearchDatabaseAPI.isColumnDescSorted;

                $scope.pageChanged = pageChanged;
                $scope.searchWS = search;
                $scope.sortDatabase = sortDatabase;
                $scope.isSearchStarted = isSearchStarted;
                $scope.clickRow = clickRow;
                $scope.entryValue = entryValue;
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
                    $scope.page = 0;
                    searchStarted = true;
                    SearchDatabaseAPI.searchWS();
                }

                function pageChanged() {
                    SearchDatabaseAPI.changePage($scope.page - 1);
                }

                function sortDatabase(index) {
                    SearchDatabaseAPI.sortDatabase(index, $scope.page - 1);
                }

                function changePageSize() {
                    $scope.page = 1;
                    SearchDatabaseAPI.changePageSize($scope.userPageSize);
                }

                function clickRow(dataIndex, data) {
                    if (data.hasOwnProperty("complex") && data.complex) return;
                    if (data.hasOwnProperty("complexFound") && data.complexFound) {
                        data.complexFound = false;
                        data.row.entries[1].complexFound = false;
                        SearchDatabaseAPI.deleteRow(dataIndex + 1);
                        return;
                    }
                    var complexId = data.row.entries[0].value;
                    var gene = data.row.entries[1].value;
                    if (complexId != 0) {
                        SearchDatabaseAPI.findComplexes(complexId, gene, dataIndex);
                    } else {
                        notify.notice('Search', 'Complex not found');
                    }
                }

                function isComplex(entry) {
                    return entry.hasOwnProperty('complex') && entry.complex;
                }

                function isComplexParent(entry) {
                    return entry.hasOwnProperty('complexFound') && entry.complexFound;
                }

                function entryValue(entry, entries) {
                    var value = entry.value;
                    var dataType = entry.column.metadata['data.type'];
                    if (entry.column.metadata.name === 'cdr3') {
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
                    if (entry.column.metadata.name === 'gene') {
                        var prefix = '';
                        if (entries[0].value != 0) {
                            prefix = '<i class="fa cursor_pointer" ng-class="{\'fa-plus\':!isComplexParent(entry) && !isComplex(entry), \'fa-minus\':isComplexParent(entry)}" aria-hidden="true" ' +
                                'ng-click="::clickRow(dataIndex, data)"></i>';
                        } else {
                            prefix = '<i class="fa fa-plus cursor_pointer" style="color: #D3D3D3;" ng-click="::clickRow(dataIndex, data)""></i>'
                        }

                        switch (value) {
                            case 'TRA':
                                value = prefix + '<text class="tra_text_color">\t' + value + '</text>';
                                break;
                            case 'TRB':
                                value = prefix + '<text class="trb_text_color">\t ' + value + '</text>';
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
                            if (entry.column.metadata.name === 'cdr3fix') {
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
                                'title="' + entry.column.metadata.title + '" data-content="' + text + '" clip-copy="copyToClip(\'' + text + '\')"' +
                                'clip-click-fallback="clipNoFlash(\'' + text + '\')" clip-click="copyToClipNotification()"></i>'
                        } catch (e) {
                            value = ''
                        }
                    }
                    return value;
                }

                function columnHeader(entry) {
                    var column = entry.column;
                    var header = '<text class="column_popover" data-trigger="hover" data-toggle="popover" data-placement="top" data-content="' +
                    column.metadata.comment + '">' + column.metadata.title +  '</text>';
                    return $sce.trustAsHtml(header);
                }

                function isColumnVisible(entry) {
                    return entry.column.metadata.visible != 0
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