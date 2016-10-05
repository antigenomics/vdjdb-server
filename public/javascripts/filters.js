(function() {
    "use strict";
    var application = angular.module('filters', ['ngWebSocket', 'table', 'notifications']);

    application.factory('filters', ['$websocket', 'table', 'notify', function ($websocket, table, notify) {

        var textFilters = [];
        var sequenceFilters = [];
        var textFilterID = 0;
        var sequenceFilterID = 0;

        var textFiltersHide = false
        var sequenceFiltersHide = false

        var columnsLoading = true;
        var presetsLoading = true;
        var error = false;

        var textFiltersColumns = [];
        var sequenceFiltersColumns = [];
        var sequencePresets = [];
        var customPreset = {
            name: 'custom'
        };

        var connection = $websocket('ws://' + location.host + '/filters/connect');
        var pingWebSocket = null;

        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring', allowNegative: true, description: 'substring' },
            { name: 'exact', title: 'Exact', allowNegative: true, description: 'exact' },
            { name: 'level', title: 'Level', allowNegative: false, description: 'level' },
            { name: 'frequency', title: 'Frequency', allowNegative: false, description: 'frequency' },
            { name: 'identification', title: 'Method', allowNegative: false, description: 'identification' }  
        ]);

        connection.onOpen(function() {
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

        connection.onMessage(function(message) {
            var response = JSON.parse(message.data);
            var filter = {};
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'columns':
                            initialize(response.columns);
                            table.setColumns(response.columns);
                            columnsLoading = false;
                            break;
                        case 'presets':
                            presets(response.presets);
                            presetsLoading = false;
                            break;
                        case 'compute_recall':
                            filter = findSequenceFilterById(response.id);
                            filter.loading = false;
                            filter.recall = response.value;
                            filter.preset = customPreset;
                            break;
                        case 'compute_precision':
                            filter = findSequenceFilterById(response.id);
                            filter.loading = false;
                            filter.precision = response.value;
                            filter.preset = customPreset;
                            break;
                        default:
                            notify.notice('Search', 'Invalid response');
                            break;
                    }
                    break;
                case 'warn':
                    angular.forEach(response.warnings, function(warning) {
                        notify.notice('Search', warning);
                    });
                    break;
                case 'error':
                    notify.error('Search', response.message);
                    break;
            }
        });

        connection.onError(function() {
            error = true;
            clearInterval(pingWebSocket);
        });

        connection.onClose(function() {
            error = true;
            clearInterval(pingWebSocket);
        });

        function initialize(columns) {
            textFiltersColumns.push({
                name: 'method',
                title: 'Frequency',
                types: [3],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[3]
            });
            textFiltersColumns.push({
                name: 'method',
                title: 'Method',
                types: [4],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[4]
            })
            angular.forEach(columns, function(column) {
                var meta = column.metadata;
                if (meta.searchable === '1') {
                    if (meta.columnType === 'txt') {
                        textFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: (function() {
                                if (meta.dataType === 'uint')
                                    return [2];
                                return [0, 1]
                            }()),
                            allowNegative: (function() {
                                return meta.dataType !== 'uint';
                            }()),
                            autocomplete: column.autocomplete,
                            values: column.values,
                            defaultFilterType: (function() {
                                if (meta.dataType === 'uint')
                                    return textFiltersTypes[2];
                                return textFiltersTypes[1];
                            }())
                        })
                    } else if (meta.columnType === 'seq') {
                        textFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1],
                            allowNegative: true,
                            autocomplete: false,
                            values: [],
                            defaultFilterType: textFiltersTypes[1]
                        });
                        sequenceFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1],
                            allowNegative: true,
                            autocomplete: false,
                            values: []
                        })
                    }
                }
            });
            columnsLoading = false;
        }

        function presets(newPresets) {
            sequencePresets.splice(0, sequencePresets.length);
            angular.extend(sequencePresets, newPresets);
            presetsLoading = false
        }

        function getTextFiltersColumns() {
            return textFiltersColumns;
        }

        function getTextFiltersTypes() {
            return textFiltersTypes;
        }

        function getTextFilters() {
            return textFilters;
        }

        function addTextFilter() {
            if (!error && !columnsLoading) {
                textFilters.push({
                    id: textFilterID++,
                    columnId: '',
                    columnTitle: 'Please select column name:',
                    value: '',
                    filterType: textFiltersTypes[1],
                    negative: false,
                    types: [0, 1, 2],
                    activeColumn: false,
                    activeType: false
                });
                showTextFiltersPopover();
            }
        }

        function deleteTextFilter(filter) {
            var index = textFilters.indexOf(filter);
            if (index >= 0) textFilters.splice(index, 1);
            showTextFiltersPopover();
            return index;
        }

        function findTextFilterById(id) {
            for (var i = 0; i < textFilters.length; i++) {
                if (textFilters[i].id === id) return textFilters[i];
            }
            return {};
        }

        function getSequenceFiltersColumns() {
            return sequenceFiltersColumns;
        }

        function getSequenceFilters() {
            return sequenceFilters;
        }

        function addSequenceFilter() {
            sequenceFilters.push({
                id: sequenceFilterID++,
                columnTitle: 'Please select column name: ',
                columnId: '',
                query: '',
                //preset: sequencePresets[0],
                //presetName: sequencePresets[0].name,
                //mismatches: sequencePresets[0].mismatches,
                mismatches: 2,
                //insertions: sequencePresets[0].insertions,
                insertions: 1,
                //deletions: sequencePresets[0].deletions,
                deletions: 1,
                //mutations: sequencePresets[0].mutations,
                mutations: 2,
                //precision: -1.0,
                //recall: -1.0,
                activeColumn: false,
                //activePreset: false,
                loading: false
            });
            showSequenceFiltersPopover();
        }

        function deleteSequenceFilter(filter) {
            var index = sequenceFilters.indexOf(filter);
            if (index >= 0) sequenceFilters.splice(index, 1);
            showSequenceFiltersPopover();
            return index;
        }

        function findSequenceFilterById(id) {
            for (var i = 0; i < sequenceFilters.length; i++) {
                if (sequenceFilters[i].id === id) return sequenceFilters[i];
            }
            return {};
        }

        function isFiltersLoaded() {
            return !columnsLoading && !presetsLoading;
        }

        function isFiltersError() {
            return error;
        }

        function getDefaultFilterTypes() {
            return textFiltersTypes;
        }

        function getFiltersRequest() {
            var textFiltersRequest = [];

            angular.forEach(textFilters, function(filter) {
                textFiltersRequest.push({
                    columnId: filter.columnId,
                    value: filter.value,
                    filterType: filter.filterType.name,
                    negative: filter.negative
                })
            });

            return {
                textFilters: textFiltersRequest,
                sequenceFilters: sequenceFilters
            }
        }

        function getPresets() {
            return sequencePresets;
        }

        function filtersInit(callback) {
            callback(textFilters, sequenceFilters)
        }

        function getRecallByPrecision(filter) {
            filter.loading = true;
            connection.send({
                action: 'compute_recall',
                data: {
                    value: filter.precision,
                    id: filter.id
                }
            })
        }

        function getPrecisionByRecall(filter) {
            filter.loading = true;
            connection.send({
                action: 'compute_precision',
                data: {
                    value: filter.recall,
                    id: filter.id
                }
            })
        }

        function isTextFiltersHidden() {
            return textFiltersHide;
        }

        function isSequenceFiltersHidden() {
            return sequenceFiltersHide;
        }

        function hideTextFilters() {
            textFiltersHide = true;
        }

        function hideSequenceFilters() {
            sequenceFiltersHide = true;
        }

        function showTextFiltersPopover() {
            //TODO: Overhead, no need to destroy each time    
            setTimeout(function() {
                angular.forEach(textFilters, function(filter) {
                    var column = table.columnByName(filter.columnId);
                    $("#filter_hint_" + filter.id).popover('destroy');
                    $("#filter_hint_" + filter.id).popover({
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        trigger: 'hover',
                        animation: false,
                        content: '<div>' + (column == null ? 'Please select column name' : filter.columnTitle + ': ' + column.metadata.comment) + '</div>'// +
                                 //'<hr>'+
                                 //'<div>' + filter.filterType.title + ': ' + filter.filterType.description + '</div>'
                    });
                });
            }, 100);
        }

        function showSequenceFiltersPopover() {
            //TODO: Overhead, no need to destroy each time    
            setTimeout(function() {
                angular.forEach(sequenceFilters, function(filter) {
                    var column = table.columnByName(filter.columnId);
                    $("#filter_hint_seq_" + filter.id).popover('destroy');
                    $("#filter_hint_seq_" + filter.id).popover({
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        trigger: 'hover',
                        animation: false,
                        content: '<div>' + (column == null ? 'Please select column name' : filter.columnTitle + ': ' + column.metadata.comment) + '</div>'// +
                                 //'<hr>'+
                                 //'<div>' + filter.filterType.title + ': ' + filter.filterType.description + '</div>'
                    });
                });
            }, 100);   
        }

        return {
            initialize: initialize,
            presets: presets,
            getTextFiltersColumns: getTextFiltersColumns,
            getTextFiltersTypes: getTextFiltersTypes,
            getTextFilters: getTextFilters,
            addTextFilter: addTextFilter,
            deleteTextFilter: deleteTextFilter,
            findTextFilterById: findTextFilterById,
            getSequenceFiltersColumns: getSequenceFiltersColumns,
            getSequenceFilters: getSequenceFilters,
            addSequenceFilter: addSequenceFilter,
            deleteSequenceFilter: deleteSequenceFilter,
            findSequenceFilterById: findSequenceFilterById,
            isFiltersLoaded: isFiltersLoaded,
            isFiltersError: isFiltersError,
            getDefaultFilterTypes: getDefaultFilterTypes,
            getFiltersRequest: getFiltersRequest,
            getPresets: getPresets,
            filtersInit: filtersInit,
            getRecallByPrecision: getRecallByPrecision,
            getPrecisionByRecall: getPrecisionByRecall,
            hideTextFilters: hideTextFilters,
            hideSequenceFilters: hideSequenceFilters,
            isTextFiltersHidden: isTextFiltersHidden,
            isTextFiltersHidden: isSequenceFiltersHidden,
            showTextFiltersPopover: showTextFiltersPopover,
            showSequenceFiltersPopover: showSequenceFiltersPopover

        }
    }]);

    application.directive('filters', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function ($scope, filters) {
                // $scope.sliderOptions = {
                //     min: 0,
                //     max: 1,
                //     step: 1e-2,
                //     value: 0
                // };

                $scope.textFilters = filters.getTextFilters();
                $scope.textFiltersColumns = filters.getTextFiltersColumns();
                $scope.textFiltersTypes = filters.getTextFiltersTypes();
                $scope.addTextFilter = filters.addTextFilter;
                $scope.deleteTextFilter = filters.deleteTextFilter;

                $scope.sequenceFilters = filters.getSequenceFilters();
                $scope.sequenceFiltersColumns = filters.getSequenceFiltersColumns();
                $scope.addSequenceFilter = filters.addSequenceFilter;
                $scope.deleteSequenceFilter = filters.deleteSequenceFilter;

                $scope.isTextFiltersHidden = filters.isTextFiltersHidden;
                $scope.isSequenceFiltersHidden = filters.isSequenceFiltersHidden;

                //$scope.presets = filters.getPresets();

                $scope.isFiltersLoaded = filters.isFiltersLoaded;
                $scope.isFiltersError = filters.isFiltersError;

                $scope.isTextFiltersExist = function () {
                    return $scope.textFilters.length > 0;
                };


                $scope.isSequenceFiltersExist = function() {
                    return $scope.sequenceFilters.length > 0;
                };

                $scope.switchColumnVisible = function(filter) {
                    filter.activeColumn = !filter.activeColumn;
                };

                $scope.isColumnActive = function(filter) {
                    return filter.activeColumn;
                };

                $scope.clickTextColumn = function(filter, column) {
                    filter.columnId = column.name;
                    filter.columnTitle = column.title;
                    filter.types = column.types;
                    filter.filterType = column.defaultFilterType;
                    filter.negative = false;
                    filter.activeColumn = false;
                    if (column.autocomplete) {
                        $("#text_filter_" + filter.id).autocomplete({
                            source: column.values,
                            minLength: 0
                        });
                    } else {
                        $("#text_filter_" + filter.id).autocomplete({
                            source: [],
                            minLength: 0
                        });
                    }
                    filters.showTextFiltersPopover();
                };

                $scope.clickSequenceColumn = function(filter, column) {
                    filter.columnId = column.name;
                    filter.columnTitle = column.title;
                    filter.activeColumn = false;
                    filters.showSequenceFiltersPopover();
                };

                $scope.switchTypeVisible = function(filter) {
                    filter.activeType = !filter.activeType;
                };

                $scope.isTypeActive = function(filter) {
                    return filter.activeType;
                };

                $scope.clickType = function(filter, typeIndex) {
                    filter.filterType = $scope.textFiltersTypes[typeIndex];
                    filter.activeType = false;
                };

                //Preset feature in development
                // $scope.switchPresetVisible = function(filter) {
                //     filter.activePreset = !filter.activePreset;
                // };

                // $scope.isPresetActive = function(filter) {
                //     return filter.activePreset;
                // };

                // $scope.clickPreset = function(filter, preset) {
                //     filter.preset = preset;
                //     filter.precision = 0.0;
                //     filter.recall = 0.0;
                //     filter.mismatches = preset.mismatches;
                //     filter.insertions = preset.insertions;
                //     filter.deletions = preset.deletions;
                //     filter.mutations = preset.mutations;
                //     filter.threshold = preset.threshold;
                //     filter.presetName = preset.name;
                //     filter.activePreset = false;
                // };

                // $scope.precisionStopSlide = function precisionStopSlide(filter) {
                //     filters.getRecallByPrecision(filter)
                // };

                // $scope.recallStopSlide = function recallStopSlide(filter) {
                //     filters.getPrecisionByRecall(filter)
                // };

            }]
        }
    });

}());