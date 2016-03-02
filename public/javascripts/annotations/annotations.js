(function() {
    var application = angular.module('annotationsPage', ['user', 'notifications']);

    application.factory('sidebar', ['user', function(userInfo) {
        var user = userInfo.getUser();
        var selectedFile = '';

        function files() {
            return user.files;
        }

        function isFilesExist() {
            return user.files.length > 0;
        }

        function deleteFile(file) {
            userInfo.deleteFile(file);
            if (file === selectedFile) selectedFile = '';
        }

        function deleteAllFiles() {
            userInfo.deleteAllFiles();
            selectedFile = '';
        }

        function select(file) {
            selectedFile = file;
        }

        function getSelectedFile() {
            return selectedFile;
        }

        function isFileSelected() {
            return selectedFile !== '';
        }

        return {
            files: files,
            isFilesExist: isFilesExist,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles,
            select: select,
            getSelectedFile: getSelectedFile,
            isFileSelected: isFileSelected
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


            }]
        }
    });

    application.factory('annotations', ['$http', 'sidebar', 'notify', function($http, sidebar, notify) {

        var loading = false;

        function intersect() {
            var file = sidebar.getSelectedFile();
            loading = true;
            $http.post('/annotations/intersect', { fileName: file.fileName })
                .success(function(data) {
                    intersectResultsTable(data);
                    loading = false;
                    //angular.copy(data, intersectData);
                })
                .error(function(response) {
                    notify.error(response.message);
                    loading = false;
                })
        }

        function isLoading() {
            return loading;
        }

        return {
            intersect: intersect,
            isLoading: isLoading
        }
    }]);

    application.directive('annotations', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', 'annotations', function($scope, sidebar, annotations) {
                $scope.isFileSelected = sidebar.isFileSelected;
                $scope.selectedFile = sidebar.getSelectedFile;
                $scope.intersect = annotations.intersect;
                $scope.isLoading = annotations.isLoading;
            }]
        }
    })
}());


function intersectResultsTable(data) {
    var clonotypes = [];
    angular.forEach(data, function (result) {
        //TODO code must be simple, maybe push clonotype itself
        var cdr = cdr3Transform(result.clonotype.cdr);
        clonotypes.push({
            freq: result.clonotype.freq,
            count: result.clonotype.count,
            cdr3aa: cdr.cdr3aa,
            cdr3nt: cdr.cdr3nt,
            v: result.clonotype.v,
            j: result.clonotype.j,
            helpers: result.alignmentHelperList
        });
    });

    var columns = [
        {
            className:      'details-control',
            orderable:      false,
            data:           null,
            defaultContent: '',
            width: '5%'
        },
        { data: 'freq', width: '5%' },
        { data: 'count', width: '5%' },
        { data: 'cdr3aa' },
        { data: 'v' },
        { data: 'j' },
        { data: 'cdr3nt'}
    ];

    var dataTable = $('#intersect_report_table').DataTable({
        data: clonotypes,
        columns: columns,
        order: [
            [1, 'desc']
        ]
    });

    function format(d) {
        var helpers = d.helpers;
        var addInfo = '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px; background-color: #DCDCDC">';
        addInfo += '<tr><td>Matches: </td></tr>';
        angular.forEach(helpers, function(helper) {
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
                '</tr>'
        });
        addInfo += '</table>';
        return addInfo;
    }

    $('#intersect_report_table tbody').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = dataTable.row( tr );

        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            console.log(row.data());
            row.child( format(row.data()) ).show();
            tr.addClass('shown');
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
