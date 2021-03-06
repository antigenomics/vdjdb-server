(function() {
    "use strict";

    var application = angular.module('intersectionPage', ['user', 'notifications', 'filters', 'ngWebSocket', 'ui.bootstrap', 'ngClipboard', 'table', 'chart.js']);

    application.factory('sidebar', ['user', 'filters', function(userInfo, filters) {

        var fileIndex = 0;

        filters.setOptions({
            filters_tcr: [
                {name: 'species_option', value: true},
                {name: 'chain_option', value: true},
                {name: 'collapse', value: false},
                {name: 'germline', value: false},
                {name: 'cdr3',     value: false}
            ],
            filters_ag: [
                {name: 'block', value: false}
            ],
            filters_mhc: [
                {name: 'collapse', value: false},
                {name: 'haplotype', value: false}
            ],
            filters_meta: [
                {name: 'collapse', value: false}
            ]
        });

        userInfo.initialize(function(files) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                file.index = fileIndex++;
                file.rows = [];
                file.intersected = false;
                file.loading = false;
                file.totalItems = 0;
                file.page = 0;
                file.pageSize = 25;
                file.sort = {
                    column: 'count',
                    type: 'desc'
                };
                file.hammingDistanceActive = false;
                file.parameters = {
                    hammingDistance: 0,
                    matchV: true, 
                    matchJ: true
                };
                file.summaryData = {};
                file.summaryChartsIndex = 0;
                file.summaryCharts = [];
            }
        });

        var user = userInfo.getUser();
        var selectedFileUID = -1;

        function files() {
            return user.files;
        }

        function isFilesExist() {
            return user.files.length > 0;
        }

        function deleteFile(file) {
            userInfo.deleteFile(file);
            if (file.uid === selectedFileUID) selectedFileUID = -1;
        }

        function deleteAllFiles() {
            userInfo.deleteAllFiles();
            selectedFileUID = -1;
        }

        function select(file) {
            selectedFileUID = file.uid;
        }

        function getSelectedFile() {
            if (selectedFileUID < 0) return {};
            return user.files[selectedFileUID];
        }

        function getFileByFilename(fileName) {
            for (var i = 0; i < user.files.length; i++) {
                if (user.files[i].fileName === fileName) return user.files[i];
            }
            return {};
        }

        function isFileSelected() {
            return selectedFileUID >= 0;
        }

        function isFile(file) {
            return selectedFileUID === file.uid;
        }

        function isHammingDistanceActive(file) {
            return file.hammingDistanceActive;
        }

        function switchHammingDistanceActive(file) {
            file.hammingDistanceActive = !file.hammingDistanceActive;
        }

        function hammingDistance(file, max) {
            file.hammingDistanceActive = false;
            file.parameters.hammingDistance = max;
        }

        return {
            files: files,
            isFilesExist: isFilesExist,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles,
            select: select,
            getSelectedFile: getSelectedFile,
            getFileByFileName: getFileByFilename,
            isFileSelected: isFileSelected,
            isFile: isFile,
            isHammingDistanceActive: isHammingDistanceActive,
            switchHammingDistanceActive: switchHammingDistanceActive,
            hammingDistance: hammingDistance
        }
    }]);

    application.directive('sidebar', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', function($scope, sidebar) {

                $scope.files = sidebar.files;
                $scope.isFilesExist = sidebar.isFilesExist;
                $scope.deleteFile = sidebar.deleteFile;
                $scope.deleteAllFiles = sidebar.deleteAllFiles;
                $scope.select = sidebar.select;
                $scope.isFileSelected = sidebar.isFileSelected;
                $scope.isFile = sidebar.isFile;


            }]
        }
    });

    application.factory('intersection', ['$websocket', 'sidebar', 'table', 'notify', 'filters', 'user', function($websocket, sidebar, table, notify, filters, userInfo) {

        var connected = false;
        var connectionError = false;
        var pingWebSocket = null;
        var connection = $websocket('ws://' + location.host + '/intersection/connect');
        var loading = false;

        connection.onMessage(function(message) {
            var response = JSON.parse(message.data);
            var file = {};
            loading = false;
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'intersect':
                            file = sidebar.getFileByFileName(response.fileName);
                            if (file.hasOwnProperty('fileName')) {
                                file.rows.splice(0, file.rows.length);
                                file.sort.column = 'count';
                                file.sort.type = 'desc';
                                file.totalItems = response.totalItems;
                                file.page = 1;
                                angular.extend(file.rows, response.rows);
                                file.loading = false;
                                file.summaryData = response.summary.data;
                                angular.forEach(file.summaryCharts, function(summaryChart) {
                                    updateSummaryChartData(file, summaryChart);
                                });
                            } else {
                                notify.notice('Intersection', 'You have no file named ' + response.fileName)
                            }
                            break;
                        case 'get_page':
                            file = sidebar.getFileByFileName(response.fileName);
                            if (file.hasOwnProperty('fileName')) {
                                file.rows.splice(0, file.rows.length);
                                angular.extend(file.rows, response.rows);
                                file.loading = false;
                            } else {
                                notify.notice('Intersection', 'You have no file named ' + response.fileName)
                            }
                            break;
                        case 'sort':
                            file = sidebar.getFileByFileName(response.fileName);
                            if (file.hasOwnProperty('fileName')) {
                                file.sort.column = response.column;
                                file.sort.type = response.sortType;
                                file.rows.splice(0, file.rows.length);
                                angular.extend(file.rows, response.rows);
                                file.page = 1;
                                file.loading = false;
                            }
                            break;
                        case 'helper_list':
                            file = sidebar.getFileByFileName(response.fileName);
                            if (file.hasOwnProperty('fileName')) {
                                file.rows.forEach(function(row) {
                                    if (row.id === response.id) {
                                        if (row.hasOwnProperty('helpers')) {
                                            row.helpers.splice(0, row.helpers.length);
                                        } else {
                                            row.helpers = [];
                                        }
                                        angular.extend(row.helpers, response.helpers);
                                        row.showHelpers = true;
                                    }
                                });
                                file.loading = false;
                            }
                            break;
                        case "export":
                            file = sidebar.getFileByFileName(response.fileName);
                            var elem = document.createElement('a');
                            var link = response.link;
                            var exportType = response.exportType;
                            elem.href = '/intersection/doc/' + exportType + '/' + link;
                            document.body.appendChild(elem);
                            elem.click();
                            file.loading = false;
                            break;
                        default:
                            notify.error('Intersection', 'Unknown action')
                    }
                    break;
                case 'warn':
                    angular.forEach(response.warnings, function(warning) {
                        notify.notice('Intersection', warning);
                    });
                    break;
                case 'error':
                    if (response.hasOwnProperty('fileName')) {
                        file = sidebar.getFileByFileName(response.fileName);
                        if (file.hasOwnProperty('fileName')) {
                            file.loading = false;
                        }
                    }
                    notify.error('Intersection', response.message);
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
            connected = true;
            connection.send({
                action: 'columns',
                data: {}
            });
            connection.send({
                action: 'presets',
                data: {}
            });
            pingWebSocket = setInterval(function() {
                connection.send({
                    action: 'ping',
                    data: {}
                });
            }, 10000)
        });

        function intersect(file) {
            checkFile(file, function() {
                if (!filters.isValid()) {
                    var errors = filters.getErrors();
                    angular.forEach(errors, function(error) {
                        notify.error('Search', error);
                    });
                } else {
                    connection.send({
                        action: 'intersect',
                        data: {
                            filters: filters.getFilters(),
                            fileName: file.fileName,
                            parameters: file.parameters
                        }
                    })
                }
            })
        }

        function exportDocument(file, type) {
            checkFile(file, function() {
                connection.send({
                    action: 'export',
                    data: {
                        fileName: file.fileName,
                        exportType: type
                    }
                })
            })
        }

        function changePage(file) {
            checkFile(file, function() {
                connection.send({
                    action: 'get_page',
                    data: {
                        fileName: file.fileName,
                        page: file.page - 1
                    }
                })
            })
        }

        function sort(file, column) {
            checkFile(file, function() {
                if (file.sort.column === column) {
                    file.sort.type = file.sort.type === 'asc' ? 'desc' : 'asc';
                } else {
                    file.sort.column = column;
                    file.sort.type = 'desc';
                }
                connection.send({
                    action: 'sort',
                    data: {
                        fileName: file.fileName,
                        column: file.sort.column,
                        sortType: file.sort.type
                    }
                })
            })
        }

        function helperList(file, row) {
            if (!row.hasOwnProperty('helpers')) {
                checkFile(file, function () {
                    connection.send({
                        action: 'helper_list',
                        data: {
                            fileName: file.fileName,
                            id: row.id
                        }
                    });
                })
            } else {
                row.showHelpers = !row.showHelpers;
            }
        }

        function checkFile(file, callback) {
            if (!connected) {
                notify.notice('Intersection', 'Connecting');
                return;
            }
            if (file.hasOwnProperty('fileName') && !file.loading) {
                file.intersected = true;
                file.loading = true;
                callback()
            } else if (file.loading) {
                notify.notice('Intersection', 'Loading..')
            } else {
                notify.notice('Intersection', 'Please select a sample to annotate')
            }
        }

        function createNewSummaryChart(file) {
            if (file.summaryCharts.length > 5) {
                notify.notice('Intersection', 'Too many summary charts..');
                return;
            }
            var summaryChart = {
                index: file.summaryChartsIndex++,
                columnNameActive: false,
                columnName: 'antigen.epitope',
                availableColumnNames: [],
                functionActive: false,
                funcTitle: 'Normalized incidence count',
                func: 'f1',
                extendedData: [],
                data: [],
                labels: [],
                height: 0,
                options: {
                    maintainAspectRatio: false,
                    barThickness: 20,
                    scales: {
                        xAxes: [{
                            type: 'logarithmic',
                            display: true,
                            position: 'bottom',
                            ticks: {
                                min: 1e-12,
                                max: 1.0
                            }
                        }]
                    },
                    tooltips: {
                        displayColors: false,
                        callbacks: {
                            label: function(tooltipItem, data) {
                                var datasetIndex = tooltipItem.datasetIndex;
                                var index = tooltipItem.index;
                                var value = data.datasets[datasetIndex].data[index];

                                var tooltip = [];
                                tooltip.push(' Log10:  ' + Math.log10(Number(value)).toString());
                                tooltip.push(' Found:  ' + summaryChart.extendedData[index].found);
                                tooltip.push(' Diversity:  ' + summaryChart.extendedData[index].diversity);
                                tooltip.push(' Frequency:  ' + summaryChart.extendedData[index].frequency);
                                tooltip.push(' Total DB:  ' + summaryChart.extendedData[index].totalDB);

                                return tooltip;
                            }
                        }
                    }
                }
            };
            angular.forEach(file.summaryData, function(data, columnName) {
               summaryChart.availableColumnNames.push(columnName);
            });

            updateSummaryChartData(file, summaryChart);
            file.summaryCharts.push(summaryChart);
        }

        function deleteSummaryChart(file, summaryChart) {
            var index = file.summaryCharts.indexOf(summaryChart);
            if (index >= 0) file.summaryCharts.splice(index, 1);
        }

        function switchColumnNameSummaryChart(summaryChart) {
            summaryChart.columnNameActive = !summaryChart.columnNameActive;
        }

        function isColumnNameSummaryChartActive(summaryChart) {
            return summaryChart.columnNameActive;
        }

        function updateSummaryChartColumnName(file, summaryChart, columnName) {
            if (columnName === summaryChart.columnName) return;
            summaryChart.columnName = columnName;
            summaryChart.columnNameActive = false;
            updateSummaryChartData(file, summaryChart);
        }

        function switchFunctionSummaryChart(summaryChart) {
            summaryChart.functionActive = !summaryChart.functionActive;
        }

        function isFunctionSummaryChartActive(summaryChart) {
            return summaryChart.functionActive;
        }

        function updateSummaryChartFunction(file, summaryChart, func, funcTitle) {
            if (summaryChart.func === func) return;
            summaryChart.func = func;
            summaryChart.funcTitle = funcTitle;
            summaryChart.functionActive = false;
            updateSummaryChartData(file, summaryChart);
        }

        function updateSummaryChartData(file, summaryChart) {
            var orderedData = [];

            angular.forEach(file.summaryData[summaryChart.columnName], function(data, entryName) {
                if (data.found !== 0) {
                    var item = {
                        label:entryName,
                        found: data.found,
                        diversity: data.diversity,
                        totalDB: data.totalDB,
                        frequency: data.frequency
                    };
                    if (summaryChart.func === 'f1') {
                        item.value = data.found / (data.diversity * data.totalDB)
                    } else if (summaryChart.func === 'f2') {
                        item.value = data.found / (data.diversity * data.totalDB) * data.frequency;
                    }
                    orderedData.push(item);
                }
            });

            orderedData.sort(function(item1, item2) {
               if (item1.value > item2.value) return -1;
               if (item1.value < item2.value) return 1;
               return 0;
            });

            summaryChart.labels.length = 0;
            summaryChart.data.length = 0;
            summaryChart.extendedData.length = 0;

            summaryChart.height = (orderedData.length * 20 + 100).toString() + 'px';
            console.log(summaryChart.height);

            angular.forEach(orderedData, function(item) {
                summaryChart.labels.push(item.label);
                summaryChart.data.push(item.value);
                summaryChart.extendedData.push(item);
            });
        }

        return {
            intersect: intersect,
            changePage: changePage,
            sort: sort,
            helperList: helperList,
            exportDocument: exportDocument,
            createNewSummaryChart: createNewSummaryChart,
            deleteSummaryChart: deleteSummaryChart,
            switchColumnNameSummaryChart: switchColumnNameSummaryChart,
            isColumnNameSummaryChartActive: isColumnNameSummaryChartActive,
            updateSummaryChartColumnName: updateSummaryChartColumnName,
            switchFunctionSummaryChart: switchFunctionSummaryChart,
            isFunctionSummaryChartActive: isFunctionSummaryChartActive,
            updateSummaryChartFunction: updateSummaryChartFunction

        }
    }]);

    application.directive('intersection', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', 'intersection', 'table', function($scope, sidebar, intersection, table) {
                $scope.files = sidebar.files;
                $scope.isFile = sidebar.isFile;
                $scope.isFileSelected = sidebar.isFileSelected;

                $scope.switchHammingDistanceActive = sidebar.switchHammingDistanceActive;
                $scope.isHammingDistanceActive = sidebar.isHammingDistanceActive;
                $scope.hammingDistance = sidebar.hammingDistance;

                $scope.intersect = intersection.intersect;
                $scope.changePage = intersection.changePage;
                $scope.sort = intersection.sort;
                $scope.helperList = intersection.helperList;
                $scope.exportDocument = intersection.exportDocument;

                $scope.isIntersected = isIntersected;
                $scope.isResultsLoading = isResultsLoading;
                $scope.isResultsExist = isResultsExist;
                $scope.isColumnAscSorted = isColumnAscSorted;
                $scope.isColumnDescSorted = isColumnDescSorted;

                $scope.getColumns = table.getColumns;
                $scope.getColumnsLength = table.getColumnsLength;
                $scope.entryValue = table.entryValue;
                $scope.isEntryVisible = table.isEntryVisible;
                $scope.columnHeader = table.columnHeader;
                $scope.isColumnVisible = table.isColumnVisible;

                $scope.clipNoFlash = clipNoFlash;
                $scope.copyToClip = copyToClip;
                $scope.copyToClipNotification = copyToClipNotification;

                $scope.createNewSummaryChart = intersection.createNewSummaryChart;
                $scope.deleteSummaryChart = intersection.deleteSummaryChart;

                $scope.switchColumnNameSummaryChart = intersection.switchColumnNameSummaryChart;
                $scope.isColumnNameSummaryChartActive = intersection.isColumnNameSummaryChartActive;
                $scope.updateSummaryChartColumnName = intersection.updateSummaryChartColumnName;

                $scope.switchFunctionSummaryChart = intersection.switchFunctionSummaryChart;
                $scope.isFunctionSummaryChartActive = intersection.isFunctionSummaryChartActive;
                $scope.updateSummaryChartFunction = intersection.updateSummaryChartFunction;

                function isResultsLoading(file) {
                    return file.loading;
                }

                function isResultsExist(file) {
                    return file.rows.length > 0;
                }

                function isIntersected(file) {
                    return file.intersected;
                }

                function isColumnAscSorted(file, column) {
                    return (file.sort.column === column && file.sort.type === 'asc');
                }

                function isColumnDescSorted(file, column) {
                    return (file.sort.column === column && file.sort.type === 'desc');
                }

                $scope.$on('onRepeatLast', function(element, a, attrs) {
                    $('.row_popover').popover({
                        container: 'body',
                        html: true,
                        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><h3 class="popover-footer">Click to copy to clipboard</h3></div>'
                    });
                    $('.column_popover').popover({
                        container: 'body',
                        html: true,
                        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
                    });
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

}());

function reference_wrap(data) {
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

function intersectResultsTable(data, file) {
    var clonotypes = [];
    var uid = file.uid;
    angular.forEach(data, function (result) {
        //TODO code must be simple, maybe push clonotype itself
        var cdr = cdr3Transform(result.clonotype.cdr);
        clonotypes.push({
            freq: (result.clonotype.freq * 100).toPrecision(2) + '%',
            count: result.clonotype.count,
            cdr3aa: cdr.cdr3aa,
            cdr3nt: cdr.cdr3nt,
            v: result.clonotype.v,
            j: result.clonotype.j,
            helpers: result.alignmentHelperList,
            matches: result.alignmentHelperList.length
        });
    });

    var columns = [
        {
            className:      'details-control',
            orderable:      false,
            data:           '',
            defaultContent: '',
            width: '15px',
            title: 'Info'
        },
        { data: 'matches', title: '# Matches'},
        { data: 'freq', title: 'Frequency', width: '5%' },
        { data: 'count', title: 'Count', width: '5%' },
        { data: 'cdr3aa', title: 'CDR3aa' },
        { data: 'v', title: 'V' },
        { data: 'j', title: 'J' },
        { data: 'cdr3nt', title: 'CDR3nt'}
    ];

    if (file.table) {
        file.table.destroy();
        $('#intersect_report_table_' + uid + ' tbody').off('click');
    }

    var dataTable = $('#intersect_report_table_' + uid).DataTable({
        data: clonotypes,
        columns: columns,
        iDisplayLength: 25,
        order: [
            [3, 'desc'],
            [1, 'desc']
        ],
        oLanguage: {
            sEmptyTable: "No records found in database"
        }
    });

    file.table = dataTable;

    function format(d) {
        var helpers = d.helpers;
        var addInfo = "";
        var skipColumn = [];
        angular.forEach(helpers, function(helper) {
            addInfo += '<table cellpadding="5" cellspacing="0" border="0" width="100%">';
            var tdRow = '<tr>';
            var thRow = '<tr>';

            thRow += '<th>Score</th>';
            tdRow += '<td>' + helper.score + '</td>';

            angular.forEach(helper.row.entries, function(entry, index) {
                var meta = entry.column.metadata;
                if (meta.visible == 1) {
                    var value = entry.value;
                    if (meta['data.type'] === 'url') {
                        value = reference_wrap(entry.value);
                    } else if (meta['data.type'].indexOf('json') >= 0) {
                        try {
                            var comment = JSON.parse(value);
                            var text = "";
                            
                            angular.forEach(Object.keys(comment).sort(), function (propertyName) {
                                if (comment[propertyName] !== "")
                                    text += '<p>' + propertyName + ' : ' + comment[propertyName] + '</p>';
                            });
                            var color_i = 'black';
                            if (meta['name'] === 'cdr3fix') {
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
                            value = '<i style="color: ' + color_i + '" class="fa fa-info-circle comments-control" tab-index="0" ' +
                                'data-trigger="hover" data-toggle="popover" data-placement="left" ' +
                                'title="' + meta['title'] + '" data-content="' + text + '"></i>'
                        } catch (e) {
                            value = ''
                        }
                    }
                    var columnHeader = '<text data-trigger="hover" data-toggle="popover" data-placement="top" data-content="' + meta['comment'] + '">' +
                        meta['title'] +  '</text>';
                    thRow += '<th>' + columnHeader + '</th>';
                    tdRow += '<td>' + value + '</td>'
                }
            });
            thRow += '</tr>';
            tdRow += '</tr>';
            addInfo += thRow;
            addInfo += tdRow;
            addInfo += '</table>';

            addInfo += '<table cellpadding="5" cellspacing="0" border="0" width="100%">';
            addInfo += '<tr>' +
                    '<td class="alignment_block">' +
                        '<p class="alignment_text">' +
                            helper.alignmentHelper.seq1String +
                        '</p>' +
                        '<p class="alignment_text">' +
                            helper.alignmentHelper.markup +
                        '</p>' +
                        '<p class="alignment_text">' +
                            helper.alignmentHelper.seq2String +
                        '</p>' +
                        '<hr>' +
                    '</td>' +
                '</tr>';
            addInfo += '</table>';
        });
        return addInfo;
    }

    $('#intersect_report_table_' + uid + ' tbody').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = dataTable.row( tr );

        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            row.child( format(row.data())).show();
            tr.addClass('shown');
            $('[data-toggle="popover"]').popover({
                container: 'body',
                html: true
            }).on('click', function(e) {
                if ($(this).prop("tagName") === 'I') {
                    var content = $(this).attr('data-content');
                    content = content.replace(/<p>/gm, " ");
                    content = content.replace(/(<([^>]+)>)/ig, "\n");
                    alert(content);
                }
                e.preventDefault();

            });
        }
    } );
}

function createSubstring(cdr, start, end, color) {
    "use strict";
    return {
        start: start,
        end: end,
        color: color,
        substring: cdr.substring(start, end + 1)
    };
}

function cdr3Transform(cdr) {
    "use strict";
    var cdr3aa = cdr.cdr3aa,
        cdr3nt = cdr.cdr3nt,
        vend_nt = cdr.vend,
        dstart_nt = (cdr.dstart < 0) ? vend_nt + 1 : cdr.dstart,
        dend_nt = (cdr.dend < 0) ? vend_nt : cdr.dend,
        jstart_nt = (cdr.jstart < 0) ? 10000 : cdr.jstart,
        vend_aa = Math.floor(cdr.vend / 3),
        dstart_aa = (Math.floor(cdr.dstart / 3) < 0) ? vend_aa + 1 : Math.floor(cdr.dstart / 3),
        dend_aa = (Math.floor(cdr.dend / 3) < 0) ? vend_aa : Math.floor(cdr.dend / 3),
        jstart_aa = (Math.floor(cdr.jstart / 3) < 0) ? 10000 : Math.floor(cdr.jstart / 3);

    var cdr3nt_arr = [],
        cdr3aa_arr = [];

    while (vend_nt >= jstart_nt) jstart_nt++;
    while (vend_aa >= jstart_aa) jstart_aa++;
    while (dstart_nt <= vend_nt) dstart_nt++;
    while (dstart_aa <= vend_aa) dstart_aa++;
    while (dend_nt >= jstart_nt) dend_nt--;
    while (dend_aa >= jstart_aa) dend_aa--;

    if (vend_nt >= 0) {
        cdr3nt_arr.push(createSubstring(cdr3nt, 0, vend_nt, "#4daf4a"));
    }

    if (vend_aa >= 0) {
        cdr3aa_arr.push(createSubstring(cdr3aa, 0, vend_aa, "#4daf4a"));
    }

    if (dstart_nt - vend_nt > 1) {
        cdr3nt_arr.push(createSubstring(cdr3nt, vend_nt + 1, dstart_nt - 1, "black"));
    }

    if (dstart_aa - vend_aa > 1) {
        cdr3aa_arr.push(createSubstring(cdr3aa, vend_aa + 1, dstart_aa - 1, "black"));
    }

    if (dstart_nt > 0 && dend_nt > 0 && dend_nt >= dstart_nt) {
        cdr3nt_arr.push(createSubstring(cdr3nt, dstart_nt, dend_nt, "#ec7014"));
    }

    if (dstart_aa > 0 && dend_aa > 0 && dend_aa >= dstart_aa) {
        cdr3aa_arr.push(createSubstring(cdr3aa, dstart_aa, dend_aa, "#ec7014"));
    }

    if (jstart_nt - dend_nt > 1) {
        cdr3nt_arr.push(createSubstring(cdr3nt, dend_nt + 1, jstart_nt - 1, "black"));
    }

    if (jstart_aa - dend_aa > 1) {
        cdr3aa_arr.push(createSubstring(cdr3aa, dend_aa + 1, jstart_aa - 1, "black"));
    }

    if (jstart_nt > 0) {
        cdr3nt_arr.push(createSubstring(cdr3nt, jstart_nt, cdr3nt.length, "#377eb8"));
    }

    if (jstart_aa > 0) {
        cdr3aa_arr.push(createSubstring(cdr3aa, jstart_aa, cdr3aa.length, "#377eb8"));
    }

    var cdr3nt_result = "", element, i = 0;
    for (i = 0; i < cdr3nt_arr.length; i++) {
        element = cdr3nt_arr[i];
        cdr3nt_result += '<text style="color: ' + element.color + '">' + element.substring + '</text>';
    }
    var cdr3aa_result = "";
    for (i = 0; i < cdr3aa_arr.length; i++) {
        element = cdr3aa_arr[i];
        cdr3aa_result += '<text style="color: ' + element.color + '">' + element.substring + '</text>';
    }

    cdr.cdr3aa = cdr3aa_result;
    cdr.cdr3nt = cdr3nt_result;

    return cdr;
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
