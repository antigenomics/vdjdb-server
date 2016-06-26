(function() {
    var application = angular.module('uploadPage', ['user', 'notifications']);

    application.factory('upload', ['user', 'notify', function(userInfo, notify) {

        var uid = 0;
        var newFiles = [];
        var user = userInfo.getUser();

        function isContain(fileName) {
            var contain = false;
            angular.forEach(userInfo.getFiles(), function(file) {
                if (file.fileName === fileName) {
                    contain = true;
                }
            });
            if (!contain) {
                angular.forEach(newFiles, function(file) {
                    if ((isWaitForUpload(file) || isFileUploaded(file)) && file.fileName == fileName) {
                        contain = true;
                    }
                })
            }
            return contain;
        }

        function isSizeExceeded(file) {
            return user.maxFileSize > 0 && (file.size / 1024) > user.maxFileSize;
        }

        function isFilesCountExcedeed() {
            var newReadyFiles = 0;
            angular.forEach(newFiles, function(file) {
                if (file.waitForUpload || file.uploaded) newReadyFiles += 1;
            });
            return user.maxFilesCount > 0 && (userInfo.getFiles().length + newReadyFiles) >= user.maxFilesCount;
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
                    fileName: file.fileName + '.' + file.fileExtension,
                    uid: file.uid,
                    softwareType: file.softwareType
                };
                file.waitForUpload = false;
                file.data.submit();
            } else if (isWaitForUpload(file) && !isNameValid(file)) {
                notify.notice('Invalid name', file.fileName);
            }
        }

        function uploadAll() {
            angular.forEach(newFiles, function(file) {
                if (file.waitForUpload) uploadFile(file);
            });
        }

        function addNewFile(file, data) {
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
                uploaded: false,
                removed: false,
                ready: false,
                showSoftwareTypeSelection: false,
                softwareType: 'vdjtools',
                softwareTypeTitle: 'VDJtools',
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


    application.directive('upload', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'upload', function($scope, upload) {

                var uploadedFilesExists = false;

                $scope.newFiles = upload.getNewFiles();

                $scope.softwareTypes = [
                    { name: 'vdjtools', title: 'VDJtools'},
                    { name: 'migec', title: 'MiGec' },
                    { name: 'mitcr', title: 'MiTcr' },
                    { name: 'mixcr', title: 'MiXcr' },
                    { name: 'migmap', title: 'MigMap' },
                    { name: 'immunoseq', title: 'ImmunoSeq' },
                    { name: 'imgthighvquest', title: 'ImgtHighVQuest' }
                ];

                $scope.commonSoftwareType = {
                    name: 'vdjtools',
                    title: 'VDJtools',
                    visible: false
                };

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
                $scope.isWaitingExists = isWaitingExists;

                $scope.softwareTypeSwitch = softwareTypeSwitch;
                $scope.isShowSoftwareTypeSelection = isShowSoftwareTypeSelection;
                $scope.changeFileSoftwareType = changeFileSoftwareType;

                $scope.clickCommonSoftwareType = clickCommonSoftwareType;
                $scope.isShowCommonSoftwareType = isShowCommonSoftwareType;
                $scope.changeCommonSoftwareType = changeCommonSoftwareType;

                function isWaitingExists() {
                    var exist = false;
                    angular.forEach($scope.newFiles, function (file) {
                        if (file.waitForUpload) {
                            exist = true;
                        }
                    });
                    return exist;
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

                function isUploadedFilesExists() {
                    return uploadedFilesExists;
                }

                function addNewButtonClick() {
                    $("form input[type=file]").click();
                }

                function softwareTypeSwitch(file) {
                    file.showSoftwareTypeSelection = !file.showSoftwareTypeSelection;
                }

                function isShowSoftwareTypeSelection(file) {
                    return file.showSoftwareTypeSelection;
                }

                function changeFileSoftwareType(file, software) {
                    file.softwareType = software.name;
                    file.softwareTypeTitle = software.title;
                    file.showSoftwareTypeSelection = false;
                }

                function clickCommonSoftwareType() {
                    $scope.commonSoftwareType.visible = !$scope.commonSoftwareType.visible;
                }

                function isShowCommonSoftwareType() {
                    return $scope.commonSoftwareType.visible;
                }

                function changeCommonSoftwareType(software) {
                    $scope.commonSoftwareType.title = software.title;
                    $scope.commonSoftwareType.name = software.name;
                    $scope.commonSoftwareType.visible = false;
                    angular.forEach($scope.newFiles, function(file) {
                        if (!file.uploaded && !file.removed) {
                            file.softwareType = software.name;
                            file.softwareTypeTitle = software.title;
                        }
                    })
                }

                $('#fileupload').fileupload({
                    url: '/api/upload',
                    dataType: 'json',
                    add: function (e, data) {
                        var file = data.files[0];
                        $scope.$apply(function() {
                            upload.addNewFile(file, data);
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
                        var message = data._response.jqXHR.responseJSON.message;
                        var file = $scope.newFiles[data.formData.uid];
                        $scope.$apply(function() {
                            //TODO
                            upload.updateErrorTooltip(file, message);
                        });

                    }
                });

            }]
        }
    });

}());
