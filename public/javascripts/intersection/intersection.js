(function() {
    var application = angular.module('intersectionPage', ['user', 'notifications', 'filters']);

    application.factory('sidebar', ['user', function(userInfo) {
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
            //selectedFileUID = -1;
        }

        function deleteAllFiles() {
            userInfo.deleteAllFiles();
            selectedFileUID = -1;
        }

        function select(file) {
            selectedFileUID = file.uid;
        }

        function getSelectedFile() {
            if (selectedFileUID < 0) return null;
            return user.files[selectedFileUID];
        }

        function isFileSelected() {
            return selectedFileUID >= 0;
        }

        function isFile(file) {
            return selectedFileUID === file.uid;
        }

        return {
            files: files,
            isFilesExist: isFilesExist,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles,
            select: select,
            getSelectedFile: getSelectedFile,
            isFileSelected: isFileSelected,
            isFile: isFile
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

    application.factory('intersection', ['$http', 'sidebar', 'notify', 'filters', function($http, sidebar, notify, filters) {

        var loading = false;
        var loaded = [];

        filters.copyFilter({
            columnId: 'species',
            columnTitle: 'Species',
            value: 'HomoSapiens',
            filterType: 'exact',
            negative: false,
            allowNegative: true,
            types: [0, 1, 2],
            initialized: true,
            defaultFilterType: filters.getDefaultFilterTypes()[1]
        });

        filters.copyFilter({
            columnId: 'gene',
            columnTitle: 'Gene',
            value: 'TRB',
            filterType: 'exact',
            negative: false,
            allowNegative: true,
            types: [0, 1, 2],
            initialized: true,
            defaultFilterType: filters.getDefaultFilterTypes()[1]
        });

        filters.copyFilter({
            columnId: 'vdjdb.score',
            columnTitle: 'score',
            value: '2',
            filterType: 'exact',
            negative: false,
            allowNegative: false,
            types: [3],
            initialized: true,
            defaultFilterType: filters.getDefaultFilterTypes()[3]
        });

        function isFileLoaded(file) {
            return loaded.indexOf(file.uid) >= 0;
        }

        function intersect(parameters) {
            if (loading) {
                notify.info('Intersection', 'Please wait until server intersect previous one');
                return;
            }
            if (sidebar.isFileSelected()) {
                var file = sidebar.getSelectedFile();
                loading = true;
                filters.pickFiltersSelectData();
                $http.post('/intersection', { fileName: file.fileName, parameters: parameters, filters: {
                    textFilters: filters.getTextFilters(), sequenceFilters: filters.getSequenceFilters()
                }})
                    .success(function(data) {
                        intersectResultsTable(data, file);
                        loaded.push(file.uid);
                        loading = false;
                        //angular.copy(data, intersectData);
                    })
                    .error(function(response) {
                        notify.error('Intersect', response.message);
                        loading = false;
                    })
            }
        }

        function isFileLoading() {
            return loading;
        }

        return {
            intersect: intersect,
            isFileLoading: isFileLoading,
            isFileLoaded: isFileLoaded
        }
    }]);

    application.directive('intersection', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', 'intersection', function($scope, sidebar, intersection) {
                $scope.parameters  = {
                    matchV: false,
                    matchJ: false,
                    maxMismatches: 1,
                    maxInsertions: 0,
                    maxDeletions: 0,
                    maxMutations: 1
                };

                $scope.files = sidebar.files;
                $scope.isFileSelected = sidebar.isFileSelected;
                $scope.isFile = sidebar.isFile;
                $scope.selectedFile = sidebar.getSelectedFile;
                $scope.intersect = function() {
                    intersection.intersect($scope.parameters);
                };
                $scope.isFileLoading = intersection.isFileLoading;
                $scope.isFileLoaded = intersection.isFileLoaded;


            }]
        }
    })
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
                            angular.forEach(comment, function (value, key) {
                                if (value !== "")
                                    text += '<p>' + key + ' : ' + value + '</p>';
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
