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
    var results = [];
    angular.forEach(data, function (result) {
        results.push([result.cdr3aa, result]);
    });

    var d3Place = d3.select("#intersect_report_table");
        d3Place.html("");
    var table = d3Place.append("table")
        .attr("id", "intersect_table")
        .attr("class", "table table-hover compact");
    var thead = table.append("thead").append("tr");
    var columns = [{
        title: 'cdr3aa'
    }];

    thead.append("th").html("CDR3aa");

    var dataTable = $('#intersect_table').dataTable({
        data: results,
        columns: columns,
        dom: '<"pull-left"l><"clear">Trtd<"pull-left"i>p',
        responsive: true,
        order: [
            [0, "desc"]
        ],
        iDisplayLength: 50,
        scrollY: "350px",
        "fnRowCallback": function(nRow, aData) {
            $(nRow).click(function() {
                intersectResultReport(aData[1].alignmentHelperList)
            });
        }
    });
}

function intersectResultReport(alignmentHelperList) {
    console.log(alignmentHelperList);
    var place = d3.select("#intersect_report");
        place.html("");
    angular.forEach(alignmentHelperList, function(helper) {
        var helperPlace = place.append("div").attr("class", "alignment_block");
        var table = helperPlace.append("table").attr("class", "table");
        var thead = table.append("thead").append("tr");
        var tbody = table.append("tbody").append("tr");
        angular.forEach(helper.row.entries, function(entry) {
            thead.append("th").text(entry.column.name);
            tbody.append("td").text(entry.value);
        });

        helperPlace.append("p").attr("class", "alignment_text").text(helper.alignmentHelper.seq1String);
        helperPlace.append("p").attr("class", "alignment_text").text(helper.alignmentHelper.markup);
        helperPlace.append("p").attr("class", "alignment_text").text(helper.alignmentHelper.seq2String);
        helperPlace.append("hr");
    });
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
