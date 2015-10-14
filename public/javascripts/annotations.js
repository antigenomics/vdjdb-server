(function () {
    "use strict";

    var app = angular.module('annotations', ['ui.bootstrap']);

    app.factory('user', ['$http', '$log', function($http, $log) {
        var files = [];
        //TODO!!!!!!!!!!!!!!!!!!
        var fields = [];
        var initialized = false;
        var initializeError = false;

        $http.get('/api/annotations/filesinfo')
            .success(function(data) {
                initialized = true;
                var length = data.fileNames.length;
                for (var i = 0; i < length; i++) {
                    files.push({
                        uid: i,
                        fileName: data.fileNames[i],
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
                    })
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

        function getFields() {
            return fields;
        }

        function getFiles() {
            return files;
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
            isInitialized: isInitialized,
            isInitializeFailed: isInitializeFailed,
            removeFileFromList: removeFileFromList,
            removeAllFilesFromList: removeAllFilesFromList
        }
    }]);

    app.factory('sidebar', ['user', '$http', function(user, $http) {
        var activeFile = '';


        function getActiveFile() {
            return activeFile;
        }

        function isFileActive(file) {
            return activeFile === file;
        }

        function setActiveFile(file) {
            activeFile = file;
        }

        function isStateClear() {
            return activeFile === '';
        }

        function clearState() {
            activeFile = '';
        }

        function deleteFile(file) {
            //TODO
            if (isFileActive(file)) clearState();
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
            clearState();
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
            getActiveFile: getActiveFile,
            isFileActive: isFileActive,
            setActiveFile: setActiveFile,
            isStateClear: isStateClear,
            clearState: clearState,
            deleteFile: deleteFile,
            deleteAllFiles: deleteAllFiles
        }
    }]);

    app.directive('annotationsResults', function () {
        return {
            restrict: 'E',
            controller: ['user', 'sidebar', '$scope', '$http', '$log', '$location', '$timeout', '$sce', function (user, sidebar, $scope, $http, $log, $location, $timeout, $sce) {

                //Private variables
                var initialized = false;
                var initializeError = false;


                //Public variables
                //TODO fields
                $scope.fields = user.getFields();
                $scope.files = user.getFiles();
                $scope.activeFile = sidebar.getActiveFile();
                $scope.errorMessage = '';

                //Public functions
                $scope.setActiveFile = function(file) {
                    sidebar.setActiveFile(file);
                    if (!sidebar.isStateClear() && !file.loaded) {
                        annotationLoad(file)
                    }

                };
                $scope.isActiveFile = sidebar.isFileActive;
                $scope.deleteFile = sidebar.deleteFile;
                $scope.deleteAllFiles = sidebar.deleteAllFiles;

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

    app.directive('sharedResults', function() {
        return {
            restrict: 'E',
            controller: ['$scope', '$http', '$log', function($scope, $http, $log) {
                $scope.sharedFileName = '....';
                $scope.loading = true;
                $scope.initError = false;
                $scope.parameters = null;

                $http.post('/api/annotations/shareddata', { sharedLink: link })
                    .success(function(data) {
                        $scope.loading = false;
                        $scope.sharedFileName = data.message;
                        setAnnotaionParameters(data.annotationTable);
                        annotationTable(data.annotationTable)
                    })
                    .error(function(data) {
                        $scope.loading = false;
                        $scope.sharedFileName = data.message;
                        $scope.initError = true;
                    });

                function annotationTable(data) {
                    var d3Place = d3.select(".annotation_table");
                    d3Place.html("");
                    var table = d3Place.append("table")
                        .attr("id", "annotation_table")
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

                    var dataTable = $('#annotation_table').dataTable({
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

                function setAnnotaionParameters(parameters) {
                    $scope.parameters = {
                        deletions: parameters.deletions,
                        insertions: parameters.insertions,
                        mismatches: parameters.mismatches,
                        totalMutations: parameters.totalMutations,
                        jMatch: parameters.jMatch,
                        vMatch: parameters.vMatch
                    }
                }

            }]
        }
    });

    app.directive('annotationsUpload', function () {
        return {
            restrict: 'E',
            controller: ['$rootScope', '$scope', '$http', '$location', '$log', function ($rootScope, $scope, $http, $location, $log) {

                //Private variables
                var uid = 0;
                var uploaded = false;
                var initialized = false;
                var initialzeError = false;
                var fileNames;
                var maxFileSize;
                var maxFilesCount;

                //Public variables
                $scope.newFiles = [];
                $scope.commonSoftwareType = 'mitcr';

                //Public Functions
                $scope.isNewFilesExists = isNewFilesExists;
                $scope.addNewButtonClick = addNewButtonClick;
                $scope.uploadFile = uploadFile;
                $scope.uploadAll = uploadAll;
                $scope.isWait = isWait;
                $scope.isError = isError;
                $scope.isOk = isOk;
                $scope.isRemoved = isRemoved;
                $scope.isSuccess = isSuccess;
                $scope.changeCommonSoftwareType = changeCommonSoftwareType;
                $scope.removeFile = removeFile;
                $scope.isUploaded = isUploaded;
                $scope.showResults = showResults;
                $scope.isWaitingExists = isWaitingExists;
                $scope.isInitialized = isInitialized;
                $scope.isNameValid = isNameValid;

                initialize();

                function initialize() {
                    fileNames = [];
                    maxFileSize = 0;
                    maxFilesCount = 0;
                    initialized = true;
                    //TODO
                    /*
                     $http.get('/api/annotations/userinfo')
                     .success(function (data) {
                     fileNames = data.fileNames;
                     maxFileSize = data.maxFileSize;
                     maxFilesCount = data.maxFilesCount;
                     initialized = true;
                     })
                     .error(function () {
                     initialzeError = true;
                     })
                     */
                }

                function isContain(fileName) {
                    var contain = false;
                    angular.forEach(fileNames, function (name) {
                        if (name == fileName) {
                            contain = true;
                        }
                    });
                    if (!contain) {
                        angular.forEach($scope.newFiles, function (file) {
                            if (isWait(file) && file.fileName == fileName) {
                                contain = true;
                            }
                        })
                    }
                    return contain;
                }

                function isSizeExceeded(file) {
                    return maxFileSize > 0 && (file.size / 1024 ) > maxFileSize;
                }

                function isFilesCountExcedeed() {
                    return maxFilesCount > 0 && (fileNames.length + $scope.newFiles.length) >= maxFilesCount;
                }

                function isInitialized() {
                    return initialized;
                }

                function showResults() {
                    $('.show_results_link')[0].click();
                }

                function isUploaded() {
                    return uploaded;
                }

                function isNameValid(file) {
                    var regexp = /^[a-zA-Z0-9_.-]{1,40}$/;
                    return regexp.test(file.fileName);
                }

                function isRemoved(file) {
                    return file.tooltip === 'Removed';
                }

                function isWait(file) {
                    return file.wait;
                }

                function isWaitingExists() {
                    var exist = false;
                    angular.forEach($scope.newFiles, function (file) {
                        if (isWait(file)) {
                            exist = true;
                        }
                    });
                    return exist;
                }

                function updateTooltip(file, tooltip) {
                    file.tooltip = tooltip;
                }

                function uploadFile(file) {
                    if (isWait(file) && isNameValid(file)) {
                        updateTooltip(file, "Uploading");
                        file.data.formData = {
                            softwareTypeName: file.softwareTypeName,
                            fileName: file.fileName + '.' + file.fileExtension,
                            uid: file.uid
                        };
                        file.wait = false;
                        file.data.submit();
                    }
                }

                function changeCommonSoftwareType() {
                    angular.forEach($scope.newFiles, function (file) {
                        if (isWait(file))
                            file.softwareTypeName = $scope.commonSoftwareType;
                    });
                }

                function uploadAll() {
                    var length = $scope.newFiles.length;
                    for (var i = 0; i < length; i++) {
                        uploadFile($scope.newFiles[i]);
                    }
                }

                function addNewButtonClick() {
                    $("form input[type=file]").click();
                }

                function isNewFilesExists() {
                    return $scope.newFiles.length;
                }

                function addNew(fileName, fileExtension, data, file) {
                    $scope.$apply(function () {
                        $scope.newFiles[uid] = {
                            uid: uid,
                            fileName: fileName,
                            fileExtension: fileExtension,
                            softwareTypeName: $scope.commonSoftwareType,
                            wait: (function () {
                                return !(isFilesCountExcedeed() || isContain(fileName) || isSizeExceeded(file));

                            })(),
                            tooltip: '',
                            progress: 0,
                            result: (function () {
                                if (!(isFilesCountExcedeed() || isContain(fileName) || isSizeExceeded(file))) {
                                    return 'ok';
                                }
                                return 'error';
                            })(),
                            errorTooltip: (function () {
                                if (isFilesCountExcedeed()) {
                                    return 'You have exceeded limit of files';
                                }
                                if (isContain(fileName)) {
                                    return 'You should use unique names for your files';
                                }
                                if (isSizeExceeded(file)) {
                                    return 'File is too large';
                                }
                                return '';
                            })(),
                            data: data
                        };
                        uid++;
                    });
                }

                function removeFile(file) {
                    file.wait = false;
                    file.tooltip = 'Removed';
                }

                function updateProgress(file, progress) {
                    $scope.$apply(function () {
                        file.progress = progress;
                    })
                }

                function updateErrorTooltip(file, tooltip) {
                    $scope.$apply(function () {
                        file.errorTooltip = tooltip;
                    })
                }

                function updateResult(file, result) {
                    $scope.$apply(function () {
                        file.result = result;
                    })
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

                $('#fileupload').fileupload({
                    url: '/api/annotations/upload',
                    dataType: 'json',
                    add: function (e, data) {
                        var file = data.files[0];
                        var originalFileName = file.name;
                        var fileName = originalFileName.substr(0, originalFileName.lastIndexOf('.')) || originalFileName;
                        var fileExtension = originalFileName.substr((~-originalFileName.lastIndexOf(".") >>> 0) + 2);
                        if (fileExtension != 'txt' && fileExtension != 'gz') {
                            fileName += fileExtension;
                            fileExtension = 'txt';
                        }
                        addNew(fileName, fileExtension, data, file);
                    },
                    progress: function (e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        updateProgress(file, parseInt(data.loaded / data.total * 100, 10));
                    },
                    done: function (e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        uploaded = true;
                        fileNames.push(file.fileName);
                        updateResult(file, 'success');
                        $scope.$apply(updateTooltip(file, 'Uploaded'));
                    },
                    fail: function(e, data) {
                        var file = $scope.newFiles[data.formData.uid];
                        updateResult(file, 'error');
                        var errorMessage = data._response.jqXHR.responseJSON.errors[0].message;
                        updateErrorTooltip(file, errorMessage);
                    }
                });

            }]
        }
    });


    app.controller('tooltips', function($scope) {
        $scope.deleteButtonTooltip = 'Delete';
    })
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