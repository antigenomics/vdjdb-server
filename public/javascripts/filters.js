(function() {
    "use strict";
    var application = angular.module('filters', []);

    application.factory('filters', function () {
        var textFilters = [];
        var sequenceFilters = [];
        var textFilterIndex = 0;
        var sequenceFilterIndex = 0;

        var loading = true;
        var error = false;

        var textFiltersColumns = [];
        var sequenceFiltersColumns = [];

        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring', allowNegative: true},
            { name: 'exact', title: 'Exact', allowNegative: true},
            { name: 'pattern', title: 'Pattern', allowNegative: true},
            { name: 'level', title: 'Level', allowNegative: false}
        ]);

        function initialize(columns) {
            angular.forEach(columns, function(column) {
                var meta = column.metadata;
                if (meta.searchable === '1') {
                    if (meta.columnType === 'txt') {
                        textFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: (function() {
                                if (meta.dataType === 'uint')
                                    return [3];
                                return [0, 1, 2]
                            }()),
                            allowNegative: (function() {
                                return meta.dataType !== 'uint';
                            }()),
                            autocomplete: column.autocomplete,
                            values: column.values,
                            defaultFilterType: (function() {
                                if (meta.dataType === 'uint')
                                    return textFiltersTypes[3];
                                return textFiltersTypes[1];
                            }())
                        })
                    } else if (meta.columnType === 'seq') {
                        textFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1, 2],
                            allowNegative: true,
                            autocomplete: false,
                            values: [],
                            defaultFilterType: textFiltersTypes[1]
                        });
                        sequenceFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1, 2],
                            allowNegative: true,
                            autocomplete: false,
                            values: []
                        })
                    }
                }
            });
            loading = false;
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
            if (!error && !loading) {
                textFilters.push({
                    columnId: '',
                    columnTitle: 'Please select column name:',
                    value: '',
                    filterType: textFiltersTypes[1],
                    negative: false,
                    types: [0, 1, 2, 3],
                    activeColumn: false,
                    activeType: false
                });
            }
        }

        function deleteTextFilter(filter) {
            var index = textFilters.indexOf(filter);
            if (index >= 0) textFilters.splice(index, 1);
            return index;
        }

        function getSequenceFiltersColumns() {
            return sequenceFiltersColumns;
        }

        function getSequenceFilters() {
            return sequenceFilters;
        }

        function addSequenceFilter() {
            sequenceFilters.push({
                columnTitle: 'Please select column name: ',
                columnId: '',
                query: '',
                mismatches: 2,
                insertions: 1,
                deletions: 1,
                mutations: 2,
                columnActive: false
            });
        }

        function deleteSequenceFilter(filter) {
            var index = sequenceFilters.indexOf(filter);
            if (index >= 0) sequenceFilters.splice(index, 1);
        }

        function isFiltersLoaded() {
            return !loading;
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

        return {
            initialize: initialize,
            getTextFiltersColumns: getTextFiltersColumns,
            getTextFiltersTypes: getTextFiltersTypes,
            getTextFilters: getTextFilters,
            addTextFilter: addTextFilter,
            deleteTextFilter: deleteTextFilter,
            getSequenceFiltersColumns: getSequenceFiltersColumns,
            getSequenceFilters: getSequenceFilters,
            addSequenceFilter: addSequenceFilter,
            deleteSequenceFilter: deleteSequenceFilter,
            isFiltersLoaded: isFiltersLoaded,
            isFiltersError: isFiltersError,
            getDefaultFilterTypes: getDefaultFilterTypes,
            getFiltersRequest: getFiltersRequest
        }
    });

    application.directive('filters', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function ($scope, filters) {

                $scope.textFilters = filters.getTextFilters();
                $scope.textFiltersColumns = filters.getTextFiltersColumns();
                $scope.textFiltersTypes = filters.getTextFiltersTypes();
                $scope.addTextFilter = filters.addTextFilter;
                $scope.deleteTextFilter = filters.deleteTextFilter;

                $scope.sequenceFilters = filters.getSequenceFilters();
                $scope.sequenceFiltersColumns = filters.getSequenceFiltersColumns();
                $scope.addSequenceFilter = filters.addSequenceFilter;
                $scope.deleteSequenceFilter = filters.deleteSequenceFilter;

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
                };

                $scope.clickSequenceColumn = function(filter, column) {
                    filter.columnId = column.name;
                    filter.columnTitle = column.title;
                    filter.activeColumn = false;
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

            }]
        }
    });

}());