(function() {
    "use strict";

    var branchApplication = angular.module('branchPage', ['user', 'notifications']);

    branchApplication.factory('branch', ['user', '$http', 'notify', function(userInfo, $http, notify) {

        var uid = 0;
        var newBranches = [];
        var user = userInfo.getUser();

        function addNewBranch(file, data) {
            newBranches.push({
                uid: uid++,
                branchName: '',
                fileName: file.name,
                data: data,
                progress: 0,
                uploaded: false,
                removed: false,
                tooltip: '',
                waitForUpload: (function () {
                    //TODO isContains
                    return !(isFilesCountExcedeed() || isSizeExceeded(file));
                })(),
                result: (function () {
                    //TODO isContains
                    if (!(isFilesCountExcedeed() || isSizeExceeded(file))) {
                        return 'ok';
                    }
                    return 'error';
                })(),
                errorTooltip: (function () {
                    //TODO isContains
                    if (isFilesCountExcedeed()) {
                        return 'You have exceeded limit of files';
                    }
                    if (isSizeExceeded(file)) {
                        return 'File is too large';
                    }
                    return '';
                })(),
                fileSize: file.size
            });
        }

        function pushBranch(branch) {
            if (isNameValid(branch) && !isContain(branch.branchName)) {
                updateTooltip(branch, "Uploading");
                branch.waitForUpload = false;
                branch.data.formData = {
                    fileName: branch.fileName,
                    branchName: branch.branchName,
                    uid: branch.uid
                };
                branch.data.submit();
            } else if (!isNameValid(branch)) {
                notify.info('Warning', 'Please specify valid branch name')
            } else if (isContain(branch.branchName)) {
                notify.info('Warning', 'You should use unique names for your branches')
            }
        }

        function pushAll() {
            angular.forEach(newBranches, function(branch) {
                if (branch.waitForUpload) pushBranch(branch);
            })
        }

        function getNewBranches() {
            return newBranches;
        }

        function getSubmittedBranches() {
            return userInfo.getBranches();
        }

        function updateProgress(branch, progress) {
            branch.progress = progress;
        }

        function updateTooltip(branch, tooltip) {
            branch.tooltip = tooltip;
        }

        function updateErrorTooltip(branch, tooltip) {
            branch.result = 'error';
            branch.errorTooltip = tooltip;
        }

        function uploaded(branch) {
            branch.uploaded = true;
            branch.result = 'success';
            branch.tooltip = 'Uploaded';
        }

        function removeBranch(branch) {
            branch.tooltip = 'Removed';
            branch.removed = true;
            branch.waitForUpload = false;
        }

        function isRemoved(branch) {
            return branch.removed;
        }

        function isOk(branch) {
            return branch.result === 'ok';
        }

        function isError(branch) {
            return branch.result === 'error';
        }

        function isSuccess(branch) {
            return branch.result === 'success';
        }

        function isWaitForUpload(branch) {
            return branch.waitForUpload;
        }

        function isBranchUploaded(branch) {
            return branch.uploaded === true;
        }

        function isContain(branchName) {
            var contain = false;
            angular.forEach(userInfo.getBranches(), function(branch) {
                if (branch.branchName === branchName) {
                    contain = true;
                }
            });
            if (!contain) {
                angular.forEach(newBranches, function(branch) {
                    if (branch.branchName === branchName && isBranchUploaded(branch)) {
                        contain = true;
                    }
                })
            }
            return contain;
        }

        function isSizeExceeded(file) {
            return userInfo.getMaxFileSize() > 0 && (file.size / 1024) > userInfo.getMaxFileSize();
        }

        function isFilesCountExcedeed() {
            var newReadyBranches = 0;
            angular.forEach(newBranches, function(branch) {
                if (branch.waitForUpload || branch.uploaded) newReadyBranches += 1;
            });
            return userInfo.getMaxFilesCount() > 0 && (userInfo.getBranches().length + newReadyBranches) >= userInfo.getMaxFilesCount();
        }

        function isNewBranchesExists() {
            return newBranches.length > 0;
        }

        function isNameValid(branch) {
            if (branch.branchName.length == 0) return false;
            var regexp = /^[a-zA-Z0-9_.-]{1,40}$/;
            return regexp.test(branch.branchName);
        }

        function isSubmittedBranchesExists() {
            return userInfo.getBranches().length > 0;
        }


        return {
            addNewBranch: addNewBranch,
            getNewBranches: getNewBranches,
            getSubmittedBranches: getSubmittedBranches,
            updateProgress: updateProgress,
            uploaded: uploaded,
            removeBranch: removeBranch,
            updateTooltip: updateTooltip,
            updateErrorTooltip: updateErrorTooltip,
            pushBranch: pushBranch,
            pushAll: pushAll,
            isRemoved: isRemoved,
            isOk: isOk,
            isError: isError,
            isSuccess: isSuccess,
            isWaitForUpload: isWaitForUpload,
            isBranchUploaded: isBranchUploaded,
            isNewBranchesExists: isNewBranchesExists,
            isSubmittedBranchesExists: isSubmittedBranchesExists
        }
    }]);

    branchApplication.directive('branch', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'branch', function($scope, branches) {
                $scope.pushBranch = branches.pushBranch;
                $scope.pushAll = branches.pushAll;
                $scope.removeBranch = branches.removeBranch;
                $scope.newBranches = branches.getNewBranches();
                $scope.submittedBranches = branches.getSubmittedBranches;

                $scope.addNewButtonClick = addNewButtonClick;
                $scope.branchStatus = branchStatus;
                $scope.isError = branches.isError;
                $scope.isOk = branches.isOk;
                $scope.isRemoved = branches.isRemoved;
                $scope.isSuccess = branches.isSuccess;
                $scope.isWaitForUpload = branches.isWaitForUpload;
                $scope.isBranchUploaded = branches.isBranchUploaded;
                $scope.isNewBranchesExists = branches.isNewBranchesExists;
                $scope.isSubmittedBranchesExists = branches.isSubmittedBranchesExists;

                function branchStatus(branch) {
                    if (branch['merged']) return 'Merged';
                    if (branch['rejected']) return 'Rejected';
                    return 'In review';
                }

                function addNewButtonClick() {
                    $("form input[type=file]").click();
                }

                $('#fileupload').fileupload({
                    url: '/intersection/branch',
                    dataType: 'json',
                    add: function (e, data) {
                        var file = data.files[0];
                        $scope.$apply(function() {
                            branches.addNewBranch(file, data)
                        });
                    },
                    progress: function (e, data) {
                        var branch = $scope.newBranches[data.formData.uid];
                        $scope.$apply(function() {
                            branches.updateProgress(branch, parseInt(data.loaded / data.total * 100, 10));
                        })
                    },
                    done: function (e, data) {
                        var branch = $scope.newBranches[data.formData.uid];
                        $scope.$apply(function() {
                            branches.uploaded(branch)
                        });
                    },
                    fail: function(e, data) {
                        var message = data._response.jqXHR.responseJSON.message;
                        var branch = $scope.newBranches[data.formData.uid];
                        $scope.$apply(function() {
                            //TODO
                            branches.updateErrorTooltip(branch, message);
                        });

                    }
                });

            }]
        }
    })
}());