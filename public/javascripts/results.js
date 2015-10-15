(function () {
    "use strict";

    var app = angular.module('annotations', ['ui.bootstrap']);

    app.factory('user', ['$http', '$log', function($http, $log) {

        //TODO!!!!!!!!!!!!!!!!!!
        var fields = [];

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
                var length = data['fileNames'].length;
                for (var i = 0; i < length; i++) {
                    addFile(data['fileNames'][i]);
                }
            })
            .error(function() {
                initializeError = true;
            });

        //TODO!!!!!!!!!!!!!1
        $http.get('/api/getAvailableFields')
            .success(function(f) {
                angular.forEach(f, function(field) {
                    fields.push({
                        name: field[1],
                        db_name: field[0]
                    })
                })
            });

        function addFile(fileName) {
            files.push({
                uid: uid,
                fileName: fileName,
                data: {
                    annotationParameters: {
                        error: false,
                        errorMessage: '',
                        deletions: 1,
                        insertions: 1,
                        mismatches: 2,
                        totalMutations: 2,
                        jMatch: false,
                        vMatch: false

                    }
                },
                loading: false,
                loaded: false,
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

        function getFields() {
            return fields;
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
            getFields: getFields,
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
            controller: ['$scope', 'sidebar', 'user', function($scope, sidebar, user) {
                $scope.files = user.getFiles();
                //TODO update results data
                $scope.setActiveFile = user.setActiveFile;
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
    app.factory('results', ['user', '$http', function(user, $http) {
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

        return {
            getTabs: getTabs,
            setActiveTab: setActiveTab,
            isTabActive: isTabActive,
            getActiveTab: getActiveTab,
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
        var fields = [];

    }]);

    app.directive('annotationsResults', function () {
        return {
            restrict: 'E',
            controller: ['user', 'sidebar', '$scope', '$http', '$log', '$location', '$timeout', '$sce', function (user, sidebar, $scope, $http, $log, $location, $timeout, $sce) {


                //Public variables
                //TODO fields
                $scope.fields = user.getFields();
                $scope.files = user.getFiles();
                $scope.activeFile = user.getActiveFile();
                $scope.errorMessage = '';

                //Public functions
                $scope.setActiveFile = function(file) {
                    user.setActiveFile(file);
                    if (!user.isStateClear() && !file.loaded) {
                        annotationLoad(file)
                    }

                };
                $scope.isActiveFile = user.isFileActive;
                $scope.deleteFile = user.deleteFile;
                $scope.deleteAllFiles = user.deleteAllFiles;

                $scope.isInitialized = user.isInitialized();
                $scope.isInitializeFailed = user.isInitializeFailed();

                $scope.isUserHaveFiles = isUserHaveFiles;
                $scope.isError = isError;
                $scope.smoothScrollToTop = smoothScrollToTop;
                $scope.shareFile = shareFile;
                $scope.isLoading = isLoading;
                $scope.isLoaded = isLoaded;
                $scope.isInitError = isInitError;

                $scope.annotationLoad = annotationLoad;
                $scope.cdr3aaColored = cdr3aaColored;


                //Initializing

                function isInitialized() {
                    return initialized;
                }

                function isPageInitError() {
                    return initializeError;
                }

                function initializeFile(file) {
                    if (!file.loaded) {
                        annotationLoad(file)
                    }
                }

                function cdr3aaColored(data) {
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
                    return $sce.trustAsHtml(result);
                }

                function annotationLoad(file, parametersIgnore) {
                    var parameters = file.data.annotationParameters;
                    var d3Place = d3.select(".annotation_table_" + file.uid);
                    d3Place.html("");
                    file.loading = true;
                    clearErrors(file);
                    $http.post('/api/annotations/data', {
                        fileName: file.fileName,
                        parameters: {
                            parametersIgnore: (function() {
                                if (typeof parametersIgnore == 'undefined') {
                                    return true;
                                }
                                return parametersIgnore;
                            }()),
                            vMatch: (function() {
                                if (parameters && parameters.vMatch) return parameters.vMatch;
                                return false;
                            }()),
                            jMatch: (function() {
                                if (parameters && parameters.jMatch) return parameters.jMatch;
                                return false;
                            }()),
                            mismatches: (function() {
                                if (parameters && parameters.mismatches) return parameters.mismatches;
                                return 1;
                            }()),
                            deletions: (function() {
                                if (parameters && parameters.deletions) return parameters.deletions;
                                return 0;
                            }()),
                            insertions: (function() {
                                if (parameters && parameters.insertions) return parameters.insertions;
                                return 0;
                            }()),
                            totalMutations: (function() {
                                if (parameters && parameters.totalMutations) return parameters.totalMutations;
                                return 1;
                            }())
                        }
                    }).success(function(data) {
                        file.loading = false;
                        file.loaded = true;
                        file.data = data;
                        //TODO
                        /*
                         if (data.annotationTable.result != 'error') {
                         setAnnotaionParameters(file, data.annotationTable);
                         annotationTable(data.annotationTable, file.uid);
                         } else {
                         annotationError(file, data.annotationTable.message);
                         }
                         */
                    }).error(function(data) {
                        console.log(data);
                        file.initError = true;
                        if (data.message) {
                            showErrorMessage(data.message);
                        } else {
                            showErrorMessage('Server is currently unavailable');
                        }
                    })
                }

                function isLoading(file) {
                    return file.loading;
                }

                function isLoaded(file) {
                    return file.loaded;
                }

                function isInitError(file) {
                    return file.initError;
                }

                function shareFile(file) {
                    $http.post('/api/annotations/share', {fileName: file.fileName })
                        .success(function (data) {
                            switch (data.result) {
                                case 'success':
                                    window.location.href = '/annotations/shared/' + data.message;
                                    break;
                                case 'error':
                                    showErrorMessage(data.message);
                                    break;
                                default:
                                    showErrorMessage('Server is unavailable');
                            }
                        })
                        .error(function () {
                            showErrorMessage('Server is unavailable');
                        })
                }

                function showErrorMessage(message) {
                    $scope.errorMessage = message;
                    $timeout(function () {
                        $scope.errorMessage = '';
                    }, 10000)

                }

                function isError() {
                    return $scope.errorMessage != '';
                }

                function isUserHaveFiles() {
                    return $scope.files.length;
                }

                function removeFileFromList(file) {
                    var index = $scope.files.indexOf(file);
                    $scope.files.splice(index, 1);
                }

                function smoothScrollToTop() {
                    $('body').animate({
                        scrollTop: 0
                    }, 600);
                }

                function setActiveFile(file) {
                    $scope.activeFile = file;
                    if (file != '') {
                        initializeFile(file);
                    }
                }


                function setAnnotaionParameters(file, parameters) {
                    file.data.annotationParameters = {
                        deletions: parameters.deletions,
                        insertions: parameters.insertions,
                        mismatches: parameters.mismatches,
                        totalMutations: parameters.totalMutations,
                        jMatch: parameters.jMatch,
                        vMatch: parameters.vMatch
                    }
                }

                function annotationTable(data, id) {
                    var d3Place = d3.select(".annotation_table_" + id);
                    d3Place.html("");
                    var table = d3Place.append("table")
                        .attr("id", "annotation_table_" + id)
                        .attr("class", "table table-hover");
                    var thead = table.append("thead").append("tr");

                    thead.append("th").html("Frequency");
                    thead.append("th").html("Count");
                    thead.append("th").html("CDR3AA");
                    thead.append("th").html("V");
                    thead.append("th").html("J");

                    var column = [
                        {"data": "freq"},
                        {"data": "count"},
                        {"data": "query_cdr3aa"},
                        {"data": "query_V"},
                        {"data": "query_J"}
                    ];

                    var header = data.header;

                    for (var i = 0; i < header.length; i++) {
                        thead.append("th").html(header[i]);
                        column.push({
                            "data": header[i]
                        })
                    }

                    var dataTable = $('#annotation_table_' + id).dataTable({
                        "data": data.table,
                        "columns": column,
                        dom: '<"pull-left"f>    l<"clear">Trtd<"pull-left"i>p',
                        responsive: true,
                        order: [
                            [0, "desc"]
                        ],
                        "scrollY": "600px",
                        "columnDefs": [
                            {
                                "width": "5%",
                                "render": function (data) {
                                    return (data * 100).toPrecision(2) + '%';
                                },
                                "targets": 0
                            },
                            {
                                "width": "5%",
                                "targets": 1
                            },
                            {
                                "width": "7%",
                                "targets": 2,
                                "render": function (data) {
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
                                "targets": 3,
                                "render": function (data) {
                                    if (!data.match) {
                                        return '<text style="color: #dc6767">' + data.v + '</text>';
                                    }
                                    return data.v;
                                }
                            },
                            {
                                "targets": 4,
                                "render": function (data) {
                                    if (!data.match) {
                                        return '<text style="color: #dc6767">' + data.j + '</text>';
                                    }
                                    return data.j;
                                }

                            }
                        ]
                    })

                }

                function clearErrors(file) {
                    file.data.annotationParameters.error = false;
                }

                function annotationError(file, message) {
                    file.data.annotationParameters.error = true;
                    file.data.annotationParameters.errorMessage = message;
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