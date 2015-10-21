(function () {
    "use strict";

    var app = angular.module('annotations', ['ui.bootstrap']);

    app.factory('user', ['$http', '$log', function($http, $log) {
        var files = [];
        var activeFile = '';
        var uid = 0;
        var maxFileSize = 0;
        var maxFilesCount = 0;
        var initialized = false;
        var initializeError = false;
        $http.get('/api/annotations/filesinfo')
            .success(function(data) {
                initialized = true;
                maxFileSize = data['maxFileSize'];
                maxFilesCount = data['maxFilesCount'];
                angular.forEach(data['fileNames'], function(fileName) {
                    addFile(fileName);
                })
            })
            .error(function() {
                initializeError = true;
            });

        function addFile(fileName) {
            files.push({
                uid: uid,
                fileName: fileName,
                data: {
                    annotations: {
                        parameters: {
                            ignore: true,
                            deletions: 1,
                            insertions: 1,
                            mismatches: 2,
                            totalMutations: 2,
                            jMatch: false,
                            vMatch: false
                        },
                        loaded: false,
                        rendering: false
                    },
                    sunburst: {
                        loaded: false,
                        rendering: false
                    },
                    countpiechart: {
                        loaded: false,
                        rendering: false
                    },
                    recordscount: {
                        loaded: false,
                        rendering: false

                    }
                },
                initError: false
            });
            uid++;
        }

        function getActiveFile() {
            return activeFile;
        }

        function setActiveFile(file) {
            activeFile = file;
        }

        function isFileActive(file) {
            return activeFile === file;
        }

        function clearState() {
            activeFile = '';
        }

        function isStateClear() {
            return activeFile === '';
        }

        function getFiles() {
            return files;
        }

        function getMaxFileSize() {
            return maxFileSize;
        }

        function getMaxFilesCount() {
            return maxFilesCount;
        }

        function isInitialized() {
            return initialized;
        }

        function isInitializeFailed() {
            return initializeError;
        }

        function removeFileFromList(file) {
            var index = files.indexOf(file);
            if (index >= 0) files.splice(index, 1);
        }

        function removeAllFilesFromList() {
            files.splice(0, files.length);
        }

        return {
            getFiles: getFiles,
            getActiveFile: getActiveFile,
            setActiveFile: setActiveFile,
            isFileActive: isFileActive,
            clearState: clearState,
            isStateClear: isStateClear,
            addFile: addFile,
            getMaxFileSize: getMaxFileSize,
            getMaxFilesCount: getMaxFilesCount,
            isInitialized: isInitialized,
            isInitializeFailed: isInitializeFailed,
            removeFileFromList: removeFileFromList,
            removeAllFilesFromList: removeAllFilesFromList
        }
    }]);

    /*
        Sidebar factory and directive
     */
    app.factory('sidebar', ['user', '$http', function(user, $http) {
        function deleteFile(file) {
            //TODO
            if (user.isFileActive(file)) user.clearState();
            $http.post('/api/annotations/delete', {action: 'delete', fileName: file.fileName})
                .success(function (data) {
                    //TODO
                    user.removeFileFromList(file);
                })
                .error(function () {
                    showErrorMessage('Server is unavailable')
                })
        }

        function deleteAllFiles() {
            user.clearState();
            //TODO
            $http.post('/api/annotations/delete', {action: 'deleteAll'})
                .success(function(data) {
                    user.removeAllFilesFromList();
                })
                .error(function () {
                    showErrorMessage('Server is unavailable')
                })
        }

        return {
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles
        }
    }]);

    app.directive('sidebar', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'sidebar', 'user', 'annotations', function($scope, sidebar, user, annotations) {
                $scope.files = user.getFiles();
                $scope.setActiveFile = function(file) {
                    user.setActiveFile(file);
                    annotations.update(file);
                };
                $scope.isFileActive = user.isFileActive;
                $scope.deleteFile = sidebar.deleteFile;
                $scope.deleteAllFiles = sidebar.deleteAllFiles;
                $scope.isFileActive = user.isFileActive;
                $scope.isUserHaveFiles = function() {
                    return $scope.files.length > 0;
                }
            }]
        }
    });


    /*
        Annotation table factory and directive
     */
    app.factory('annotations', ['$http', 'sunburst', 'countpiechart', function($http, sunburst, countpie) {

        function copyParameters(data, file) {
            file.data.annotations.parameters.insertions = data.parameters.insertions;
            file.data.annotations.parameters.deletions = data.parameters.deletions;
            file.data.annotations.parameters.mismatches = data.parameters.mismatches;
            file.data.annotations.parameters.totalMutations = data.parameters.totalMutations;
            file.data.annotations.parameters.vMatch = data.parameters.vMatch;
            file.data.annotations.parameters.jMatch = data.parameters.jMatch;
        }

        function updateParameters(file) {
            file.data.annotations.parameters.ignore = false;
            file.data.annotations.parameters.totalMutations =
                file.data.annotations.parameters.deletions +
                file.data.annotations.parameters.insertions +
                file.data.annotations.parameters.mismatches;
            file.data.annotations.loaded = false;
        }

        function update(file) {
            if (!file.data.annotations.loaded) {
                sunburst.rendering(file);
                countpie.rendering(file);
                file.data.annotations.rendering = true;
                $http.post('/api/annotations/data', {
                    fileName: file.fileName,
                    parameters: file.data.annotations.parameters,
                    type: 'annotations'
                })
                    .success(function (annotations) {
                        file.data.annotations.loaded = true;
                        copyParameters(annotations, file);
                        annotationTable(annotations.table, file.uid);
                        file.data.annotations.rendering = false;
                        sunburst.update(file);
                        countpie.update(file);
                    })
                    .error(function (error) {
                        console.log(error);

                        file.data.annotations.rendering = false;
                    })
            }
        }

        function rerender(file) {
            updateParameters(file);
            clearAnnotationTable(file);
            update(file);
        }

        return {
            update: update,
            rerender: rerender
        }

    }]);

    app.directive('annotationsTable', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'annotations', function($scope, annotations) {
                $scope.isTableRendering = function(file) {
                    return file.data.annotations.rendering;
                };

                $scope.collapse = function(file, $event) {
                    var self = $($event.currentTarget);
                    var box = self.parents(".box").first();
                    //Find the body and the footer
                    var bf = box.find(".box-body, .box-footer");
                    if (!self.children().hasClass("fa-plus")) {
                        self.children(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
                        bf.slideUp();
                    } else {
                        //Convert plus into minus
                        self.children(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
                        bf.slideDown();
                    }
                };

                $scope.rerender = annotations.rerender;
            }]
        }
    });

    app.factory('sunburst', ['$http', function($http) {
        function update(file) {
            if (!file.data.sunburst.loaded) {
                file.data.sunburst.rendering = true;
                $http.post('/api/annotations/data', {
                    fileName: file.fileName,
                    parameters: file.data.annotations.parameters,
                    type: 'sunburst'
                })
                    .success(function(data) {
                        file.data.sunburst.loaded = true;
                        file.data.sunburst.rendering = false;
                        sunburstChart(data.sunburst, file.uid);
                    })
                    .error(function (error) {
                        console.log(error);
                        file.data.sunburst.rendering = false;
                    })
            }
        }

        function rendering(file) {
            clearSunburstChat(file);
            file.data.sunburst.rendering = true;
            file.data.sunburst.loaded = false;
        }

        function rendered(file) {
            file.data.sunburst.rendering = false;
        }

        return {
            update: update,
            rendering: rendering,
            rendered: rendered
        }
    }]);

    app.directive('sunburst', function() {
        return {
            restrict: 'E',
            controller: ['$scope', function($scope) {
                $scope.isSunburstChartRendering = function(file) {
                    return file.data.sunburst.rendering;
                };
            }]
        }
    });

    /*
        Count pie chart factory and directive
     */

    app.factory('countpiechart', ['$http', function($http) {
        function update(file) {
            if (!file.data.countpiechart.loaded) {
                rendering(file);
                $http.post('/api/annotations/data', {
                    fileName: file.fileName,
                    parameters: file.data.annotations.parameters,
                    type: 'countpie'
                })
                    .success(function(data) {
                        rendered(file);
                        countpiechart(data, file.uid);
                        recordsCount(data, file.uid, 1);
                        file.data.recordscount.cache = data;
                    })
                    .error(function (error) {
                        console.log(error);
                        rendered(file);
                    })
            }
        }

        function rendering(file) {
            clearCountpiechart(file);
            clearRecordsCount(file);
            file.data.countpiechart.rendering = true;
            file.data.recordscount.rendering = true;
            file.data.countpiechart.loaded = false;
            file.data.recordscount.loaded = false;
        }

        function rendered(file) {
            file.data.countpiechart.rendering = false;
            file.data.recordscount.rendering = false;
        }

        return {
            update: update,
            rendering: rendering,
            rendered: rendered
        }
    }]);

    app.directive('countpiechart', function() {
        return {
            restrict: 'E',
            controller: ['$scope', function($scope) {
                $scope.isCountPieChartRendering = function(file) {
                    return file.data.countpiechart.rendering;
                }
            }]
        }
    });

    app.directive('recordscount', function() {
        return {
            restrict: 'E',
            controller: ['$scope', function($scope) {
                $scope.isRecordsCountPieChartRendering = function(file) {
                    return file.data.recordscount.rendering;
                };

                $scope.rerenderRecordsCount = function(file, hits) {
                    recordsCount(file.data.recordscount.cache, file.uid, hits);
                }
            }]
        }
    });

    /*
       Annotations upload page directive and factory
     */
    app.factory('upload', ['$http', '$log', 'user', function($http, $log, user) {

        var uid = 0;
        var newFiles = [];
        var files = user.getFiles();
        var maxFilesCount = user.getMaxFilesCount();
        var maxFileSize = user.getMaxFileSize();

        function isContain(fileName) {
            var contain = false;
            angular.forEach(files, function (file) {
                if (file.fileName == fileName) {
                    contain = true;
                }
            });
            if (!contain) {
                angular.forEach(newFiles, function (file) {
                    if (isWaitForUpload(file) && file.fileName == fileName || isFileUploaded(file)) {
                        contain = true;
                    }
                })
            }
            return contain;
        }

        function isSizeExceeded(file) {
            return maxFileSize > 0 && (file.size / 1024) > maxFileSize;
        }

        function isFilesCountExcedeed() {
            return maxFilesCount > 0 && (files.length + newFiles.length) >= maxFilesCount;
        }

        function isNameValid(file) {
            var regexp = /^[a-zA-Z0-9_.-]{1,40}$/;
            return regexp.test(file.fileName);
        }

        function isRemoved(file) {
            return file.tooltip === 'Removed';
        }

        function isWaitForUpload(file) {
            return file.waitForUpload;
        }

        function isFileUploaded(file) {
            return file.uploaded === true;
        }

        function isNewFilesExists() {
            return newFiles.length > 0;
        }

        function getNewFiles() {
            return newFiles;
        }

        function updateTooltip(file, tooltip) {
            file.tooltip = tooltip;
        }

        function updateErrorTooltip(file, tooltip) {
            file.result = 'error';
            file.errorTooltip = tooltip;
        }

        function updateProgress(file, progress) {
            file.progress = progress;
        }

        function uploadFile(file) {
            if (isWaitForUpload(file) && isNameValid(file)) {
                updateTooltip(file, "Uploading");
                file.data.formData = {
                    softwareTypeName: file.softwareTypeName,
                    fileName: file.originalFileName,
                    uid: file.uid
                };
                file.waitForUpload = false;
                file.data.submit();
            }
        }

        function uploadAll() {
            angular.forEach(newFiles, function(file) {
                uploadFile(file);
            });
        }

        function addNewFile(file, data, softwareType) {
            var originalFileName = file.name;
            var fileName = originalFileName.substr(0, originalFileName.lastIndexOf('.')) || originalFileName;
            var fileExtension = originalFileName.substr((~-originalFileName.lastIndexOf(".") >>> 0) + 2);
            if (fileExtension != 'txt' && fileExtension != 'gz') {
                fileName += fileExtension;
                fileExtension = 'txt';
            }
            newFiles.push({
                uid: uid,
                originalFileName: originalFileName,
                fileName: fileName,
                fileExtension: fileExtension,
                softwareTypeName: softwareType,
                uploaded: false,
                removed: false,
                waitForUpload: (function () {
                    return !(isFilesCountExcedeed() || isContain(originalFileName) || isSizeExceeded(file));
                })(),
                tooltip: '',
                progress: 0,
                result: (function () {
                    if (!(isFilesCountExcedeed() || isContain(originalFileName) || isSizeExceeded(file))) {
                        return 'ok';
                    }
                    return 'error';
                })(),
                errorTooltip: (function () {
                    if (isFilesCountExcedeed()) {
                        return 'You have exceeded limit of files';
                    }
                    if (isContain(originalFileName)) {
                        return 'You should use unique names for your files';
                    }
                    if (isSizeExceeded(file)) {
                        return 'File is too large';
                    }
                    return '';
                })(),
                data: data
            });
            uid++;
        }

        function uploaded(file) {
            file.uploaded = true;
            file.result = 'success';
            file.tooltip = 'Uploaded';
            user.addFile(file.originalFileName);
        }

        function removeFile(file) {
            file.tooltip = 'Removed';
            file.removed = true;
            file.waitForUpload = false;
        }



        return {
            getNewFiles: getNewFiles,
            addNewFile: addNewFile,
            removeFile: removeFile,
            uploaded: uploaded,
            updateTooltip: updateTooltip,
            updateErrorTooltip: updateErrorTooltip,
            updateProgress: updateProgress,
            uploadFile: uploadFile,
            uploadAll: uploadAll,
            isNewFilesExists: isNewFilesExists,
            isWaitForUpload: isWaitForUpload,
            isNameValid: isNameValid
        }
    }]);

    app.directive('annotationsUpload', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'upload', function ($scope,  upload) {

                var uploadedFilesExists = false;

                //Public variables
                $scope.newFiles = upload.getNewFiles();
                $scope.softwareTypes = Object.freeze([
                    'mitcr',
                    'mixcr',
                    'migec',
                    'vdjtools',
                    'higblast',
                    'immunoseq',
                    'imgthighvquest'

                ]);
                $scope.commonSoftwareType = $scope.softwareTypes[0];
                $scope.changeCommonSoftwareType = changeCommonSoftwareType;


                //Public Functions
                $scope.removeFile = upload.removeFile;
                $scope.uploadFile = upload.uploadFile;
                $scope.isNewFilesExists = upload.isNewFilesExists;
                $scope.isWaitForUpload = upload.isWaitForUpload;
                $scope.isNameValid = upload.isNameValid;
                $scope.uploadAll = upload.uploadAll;

                $scope.addNewButtonClick = addNewButtonClick;
                $scope.isError = isError;
                $scope.isOk = isOk;
                $scope.isRemoved = isRemoved;
                $scope.isSuccess = isSuccess;
                $scope.isUploadedFilesExists = isUploadedFilesExists;
                $scope.showResults = showResults;
                $scope.isWaitingExists = isWaitingExists;

                function showResults() {
                    $('.show_results_link')[0].click();
                }

                function isWaitingExists() {
                    var exist = false;
                    angular.forEach($scope.newFiles, function (file) {
                        if (file.waitForUpload) {
                            exist = true;
                        }
                    });
                    return exist;
                }

                function changeCommonSoftwareType() {
                    angular.forEach($scope.newFiles, function (file) {
                        if (file.waitForUpload)
                            file.softwareTypeName = $scope.commonSoftwareType;
                    });
                }

                function isRemoved(file) {
                    return file.removed;
                }

                function isOk(file) {
                    return file.result === 'ok';
                }

                function isError(file) {
                    return file.result === 'error';
                }

                function isSuccess(file) {
                    return file.result === 'success';
                }

                function addNewButtonClick() {
                    $("form input[type=file]").click();
                }

                function isUploadedFilesExists() {
                    return uploadedFilesExists;
                }

                $('#fileupload').fileupload({
                    url: '/api/annotations/upload',
                    dataType: 'json',
                    add: function (e, data) {
                        var file = data.files[0];
                        $scope.$apply(function() {
                            upload.addNewFile(file, data, $scope.commonSoftwareType);
                        });
                    },
                    progress: function (e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        $scope.$apply(function() {
                            upload.updateProgress(file, parseInt(data.loaded / data.total * 100, 10));
                        })
                    },
                    done: function (e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        uploadedFilesExists = true;
                        $scope.$apply(function() {
                            upload.uploaded(file)
                        });
                    },
                    fail: function(e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        var errorMessage = data._response.jqXHR.responseJSON.errors[0].message;
                        $scope.$apply(function() {
                            upload.updateErrorTooltip(file, errorMessage);
                        });

                    }
                });

            }]
        }
    });

    /*
        Common directives and factories
     */
    app.directive('blockPageInitialization', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'user', function($scope, user) {
                $scope.isInitialized = user.isInitialized;
                $scope.isInitializeFailed = user.isInitializeFailed;
            }]
        }
    });
})();

/*
    Annotation table functions
 */

function annotationTable(data, uid) {
    var header = data.header;
    var rows = data.rows;

    var d3Place = d3.select(".annotation_table_" + uid);
        d3Place.html("");
    var table = d3Place.append("table")
        .attr("id", "annotation_table_" + uid)
        .attr("class", "table table-hover compact");
    var thead = table.append("thead").append("tr");
        thead.append("th").html("Frequency");
    var column = [{
        data: 'freq'
    }];
    for (var i = 0; i < header.length; i++) {
        thead.append("th").html(header[i].name);
        column.push({
            data: header[i].db_name
        })
    }

    var dataTable = $('#annotation_table_' + uid).dataTable({
        data: data.rows,
        columns: column,
        dom: '<"pull-left"f><"pull-right"l><"clear">Trtd<"pull-left"i>p',
        responsive: true,
        order: [
            [0, "desc"]
        ],
        iDisplayLength: 50,
        scrollY: "400px",
        columnDefs: [
            {
                width: "5%",
                targets: 0,
                render: function (data) {
                    return (data * 100).toPrecision(2) + '%';
                }
            },
            {
                width: "7%",
                targets: 1,
                render: function (data) {
                    var cdr3aa = data["cdr3aa"];
                    var vend = Math.floor(data["vend"] / 3);
                    var dstart = Math.floor(data["dstart"] / 3);
                    var dend = Math.floor(data["dend"] / 3);
                    var jstart = Math.floor(data["jstart"] / 3);
                    var pos = data["pos"];
                    jstart = (jstart < 0) ? 10000 : jstart;
                    dstart = (dstart < 0) ? vend + 1 : dstart;
                    dend = (dend < 0) ? vend : dend;
                    while (vend >= jstart) jstart++;
                    while (dstart <= vend) dstart++;
                    while (dend >= jstart) dend--;
                    var createSubString = function (start, end, color) {
                        return {
                            start: start,
                            end: end,
                            color: color,
                            substring: cdr3aa.substring(start, end + 1)
                        }
                    };

                    var insert = function (index, str, insertString) {
                        if (index > 0)
                            return str.substring(0, index) + insertString + str.substring(index, str.length);
                        else
                            return insertString + str;
                    };

                    var arr = [];

                    if (vend >= 0) {
                        arr.push(createSubString(0, vend, "#4daf4a"));
                    }

                    if (dstart - vend > 1) {
                        arr.push(createSubString(vend + 1, dstart - 1, "black"));
                    }

                    if (dstart > 0 && dend > 0 && dend >= dstart) {
                        arr.push(createSubString(dstart, dend, "#ec7014"));
                    }

                    if (jstart - dend > 1) {
                        arr.push(createSubString(dend + 1, jstart - 1, "black"));
                    }

                    if (jstart > 0) {
                        arr.push(createSubString(jstart, cdr3aa.length, "#377eb8"));
                    }

                    var result = "";
                    for (var i = 0; i < arr.length; i++) {
                        var element = arr[i];
                        if (pos >= element.start && pos <= element.end) {
                            var newPos = pos - element.start;
                            element.substring = insert(newPos + 1, element.substring, '</u></b>');
                            element.substring = insert(newPos, element.substring, '<b><u>');
                        }
                        result += '<text style="color: ' + element.color + '">' + element.substring + '</text>';
                    }
                    result = '<a href="/database#?input=' + cdr3aa +'">' + result + '</a>';
                    return result;
                }

            },
            {
                width: "5%",
                targets: 2,
                render: function (data) {
                    if (!data.match) {
                        return '<text style="color: #dc6767">' + data.v + '</text>';
                    }
                    return data.v;
                }
            },
            {
                width: "5%",
                targets: 3,
                render: function (data) {
                    if (!data.match) {
                        return '<text style="color: #dc6767">' + data.j + '</text>';
                    }
                    return data.j;
                }

            },
            {
                targets: 13,
                render: function(data) {
                    var id = data.substring(5, data.length);
                    return 'PBMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                }
            }
        ]
    })

}

function clearAnnotationTable(file) {
    var uid = file.uid;
    var place = d3.select(".annotation_table_" + uid);
        place.html("");
}

/*
    Sunburst chart functions
 */
function sunburstChart(data, uid) {
    nv.addGraph(function () {
        var place = d3.select(".sunburst_chart_" + uid);
            place.html("");

        var width = place.node().getBoundingClientRect().width,
            height = width,
            radius = Math.min(width, height) / 3,
            padding = 5;

        var x = d3.scale.linear()
            .range([0, 2 * Math.PI]);

        var y = d3.scale.sqrt()
            .range([0, radius]);

        var colors = d3.scale.category20();

        var svg = place.append("svg")
                .attr("id", "sunburst_chart_" + uid)
                .attr("class", "sunbirst")
                .style("display", "block")
                .style("overflow", "visible")
                .style("margin", "auto")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var partition = d3.layout.partition()
            .sort(null)
            .value(function (d) {
                return d.size;
            });

        var arc = d3.svg.arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
            .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)) + 50; });

        var nodes = partition.nodes(data);

        var topCount = 0;

        var path = svg.selectAll("path")
            .data(nodes)
            .enter().append("path")
            .attr("id", function(d, i) { return "path-" + i; })
            .attr("d", arc)
            .style("fill", function(d, i) {
                if (d.name == 'main') return "#ffffff";
                return colors(i);
            })
            .style("cursor", function(d) {
                if (d.children !== null) {
                    return "pointer";
                }
                return null;
            })
            .on("click", click);

        var text = svg.selectAll("text").data(nodes);
        var textEnter = text.enter().append("text")
            .style("fill-opacity", 1)
            .style("fill", function() {
                return "black";
                //return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
            })
            .attr("text-anchor", function(d) {
                return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
            })
            .attr("dy", ".2em")
            .attr("transform", function(d) {
                var multiline = (d.name || "").split(" ").length > 1,
                    angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                    rotate = angle + (multiline ? -.5 : 0);
                return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
            })
            .on("click", click);
        textEnter.append("tspan")
            .attr("x", 0)
            .text(function(d) {
                if (d.name === "main") return null;
                var label = d.name;
                if (d.size !== 0) {
                    label += "  " + (d.size.toPrecision(2))
                }
                return label;
            });

        function click(d) {
            if (d.children) {
                path.transition()
                    .duration(500)
                    .attrTween("d", arcTween(d));
                text.style("visibility", function(e) {
                    return isParentOf(d, e) ? null : d3.select(this).style("visibility");
                })
                    .transition()
                    .duration(500)
                    .attrTween("text-anchor", function(d) {
                        return function() {
                            return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                        };
                    })
                    .attrTween("transform", function(d) {
                        var multiline = (d.name || "").split(" ").length > 1;
                        return function() {
                            var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                                rotate = angle + (multiline ? -.5 : 0);
                            return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                        };
                    })
                    .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
                    .each("end", function(e) {
                        d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
                    });
            }
        }

        function isParentOf(p, c) {
            if (p == c) return true;
            if (p.children != null) {
                return p.children.some(function(d) {
                    return isParentOf(d, c);
                });
            }
            return false;
        }

        d3.select(self.frameElement).style("height", height + "px");

        // Interpolate the scales!
        function arcTween(d) {
            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                yd = d3.interpolate(y.domain(), [d.y, 1]),
                yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
            return function (d, i) {
                return i ? function (t) {
                    return arc(d);
                }
                    : function (t) {
                    x.domain(xd(t));
                    y.domain(yd(t)).range(yr(t));
                    return arc(d);
                };
            };
        }

    });
}

function clearSunburstChat(file) {
    var uid = file.uid;
    var place = d3.select(".sunburst_chart_" + uid);
    place.html("");
}

function clearCountpiechart(file) {
    var uid = file.uid;
    var place = d3.select(".count_pie_chart_" + uid);
    place.html("");
}

function countpiechart(data, uid) {
    var sectors = data["piechart"]["sectors"];
    nv.addGraph(function() {
        var place = d3.select(".count_pie_chart_" + uid);
        place.html("");

        var width = place.node().getBoundingClientRect().width,
            height = width;

        var svg = place.append("svg")
            .attr("id", "count_pie_chart_" + uid)
            .attr("class", "count_pie")
            .style("display", "block")
            .style("overflow", "visible")
            .style("margin", "auto")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var chart = nv.models.pieChart()
            .x(function(d) {
                switch (d.count) {
                    case 0: return "Not found";
                    case 1: return "Encountered one time";
                    case 2: return "Encountered two or more times";
                }
                return "";
            })
            .y(function(d) { return d.size })
            .width(width)
            .height(height)
            .color(["#377eb8", "#ec7014", "#dcdcdc"])
            .noData("There is no data to display");
        d3.select("#count_pie_chart_" + uid)
            .datum(sectors)
            .transition().duration(1200)
            .attr('width', width)
            .attr('height', height)
            .call(chart)
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");
        return chart;
    });

}

function clearRecordsCount(file) {
    var uid = file.uid;
    var place = d3.select(".records_count_" + uid);
    place.html("");
}

function recordsCount(data, uid, hits) {
    var sampleCount = data["piechart"]["sampleCount"];
    var records = data["records"];
    var sectors = [{
        hits: 0,
        count: sampleCount
    }, {
        hits: hits,
        count: 0
    }];
    console.log(sectors);
    records.forEach(function(record) {
        if (hits === 1) {
            if (record.hits === 1) {
                sectors[0].count -= record.count;
                sectors[1].count += record.count;
            }
        } else {
            if (record.hits >= 2) {
                sectors[0].count -= record.count;
                sectors[1].count += record.count;
            }
        }
    });

    nv.addGraph(function() {
        var place = d3.select(".records_count_" + uid);
        place.html("");

        var width = place.node().getBoundingClientRect().width,
            height = width;

        var svg = place.append("svg")
            .attr("id", "records_count_" + uid)
            .attr("class", "count_pie")
            .style("display", "block")
            .style("overflow", "visible")
            .style("margin", "auto")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var chart = nv.models.pieChart()
            .x(function(d) {
                switch (d.hits) {
                    case 0: return "Count of other records";
                    case 1: return "Count of records founded in db one time";
                    case 2: return "Count of records founded in db two or more times";
                }
                return "";
            })
            .y(function(d) { return d.count })
            .width(width)
            .height(height)
            .color(["#377eb8", "#ec7014", "#dcdcdc"])
            .noData("There is no data to display");
        d3.select("#records_count_" + uid)
            .datum(sectors)
            .transition().duration(1200)
            .attr('width', width)
            .attr('height', height)
            .call(chart)
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");
        return chart;
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