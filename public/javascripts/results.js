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
                        table: [],
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
            controller: ['$scope', 'sidebar', 'user', 'results', function($scope, sidebar, user, results) {
                $scope.files = user.getFiles();
                $scope.setActiveFile = function(file) {
                    user.setActiveFile(file);
                    results.update();
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
        Results factory and directive
     */
    app.factory('results', ['user', '$http', 'annotations', function(user, $http, annotations) {
        var tabs = Object.freeze({
            annotations: {
                name: 'Annotations'
            },
            placeholder: {
                name: 'Placeholder'
            }
        });
        var activeTab = tabs.annotations;

        function getTabs() {
            return tabs;
        }

        function setActiveTab(tab) {
            activeTab = tab;
        }

        function isTabActive(tab) {
            return tab === activeTab;
        }

        function getActiveTab() {
            return activeTab;
        }

        function isAnnotations() {
            return activeTab === tabs.annotations;
        }

        function isPlaceholder() {
            return activeTab === tabs.placeholder;
        }

        function update() {
            var file = user.getActiveFile();
            if (file === '') return;
            switch (activeTab) {
                case tabs.annotations:
                    annotations.update(file);
                    break;
            }
        }

        return {
            getTabs: getTabs,
            setActiveTab: setActiveTab,
            isTabActive: isTabActive,
            getActiveTab: getActiveTab,
            update: update,
            isAnnotations: isAnnotations,
            isPlaceholder: isPlaceholder
        }
    }]);

    app.directive('results', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'user', 'results', function($scope, user, results) {

                //Results API
                $scope.tabs = results.getTabs();
                $scope.setActiveTab = results.setActiveTab;
                $scope.isTabActive = results.isTabActive;
                $scope.isAnnotations = results.isAnnotations;
                $scope.isPlaceholder = results.isPlaceholder;

                //User API
                $scope.files = user.getFiles();
                $scope.isFileActive = user.isFileActive;
                $scope.isStateClear = user.isStateClear;


            }]
        }
    });


    /*
        Annotation table factory and directive
     */
    app.factory('annotations', ['$http', function($http) {

        function update(file) {
            if (!file.data.annotations.loaded) {
                file.data.annotations.rendering = true;
                $http.post('/api/annotations/data', {
                    fileName: file.fileName,
                    parameters: file.data.annotations.parameters
                })
                    .success(function (annotations) {
                        file.data.annotations.table = annotations.table;
                        file.data.annotations.loaded = true;
                        annotationTable(file);
                        file.data.annotations.rendering = false;
                    })
                    .error(function (error) {
                        console.log(error.message);
                        file.data.annotations.rendering = false;
                    })
            }
        }

        return {
            update: update
        }

    }]);

    app.directive('annotationsTable', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'annotations', function($scope, annotations) {
                $scope.isTableRendering = function(file) {
                    return file.data.annotations.rendering;
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

function annotationTable(file) {
    var data = file.data.annotations.table;
    var header = data.header;
    var rows = data.rows;
    var uid = file.uid;

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
        dom: '<"pull-left"f>    l<"clear">Trtd<"pull-left"i>p',
        responsive: true,
        order: [
            [0, "desc"]
        ],
        iDisplayLength: 70,
        scrollY: "600px",
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