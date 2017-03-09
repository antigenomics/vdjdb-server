(function() {
    "use strict";

    var module = angular.module('table', []);

    module.factory('table', function() {
        var columns = [];
        var columnsLength = 0;
        var cdr3FixColumnIndex = -1;

        function getColumns() {
            return columns;
        }

        function getVisibleColumns() {
            return columns.filter(function(column) {
                return column.metadata.visible === "1";
            });
        }

        function getColumnsLength() {
            return columnsLength;
        }

        function setColumns(newcolumns) {
            angular.forEach(newcolumns, function(column) {
                if (column.metadata.visible === "1") columnsLength += 1;
            });
            columns.splice(0, columns.length);
            angular.extend(columns, newcolumns);
            cdr3FixColumnIndex = getCdr3FixIndex();
        }

        function columnByName(columnName) {
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].name === columnName) return columns[i];
            }
            return null;
        }

        function getCdr3FixIndex() {
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].name === "cdr3fix") return i;
            }
            return null;
        }

        function entryValue(entry, entries, showComplex) {
            var value = entry.value;
            var column = columnByName(entry.columnName);
            var columnMeta = column.metadata;
            var columnName = column.name;
            var dataType = columnMeta.dataType;
            if (columnName === 'cdr3') {
                var cdr3fix = JSON.parse(entries[cdr3FixColumnIndex].value);
                var vend = cdr3fix['vEnd'];
                var jstart = cdr3fix['jStart'];
                var vRegion = '', jRegion = '', otherRegion = '';

                if (vend > 0 && jstart <= 0) {
                    vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                    otherRegion = value.substring(vend, value.length);
                    value = vRegion + otherRegion
                }
                if (vend <= 0 && jstart > 0) {
                    jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                    otherRegion = value.substring(0, jstart - 1);
                    value = otherRegion + jRegion;
                }

                if (vend > 0 && jstart > 0 && jstart >= vend) {
                    vRegion = '<text style="color: #4daf4a">' + value.substring(0, vend) + '</text>';
                    otherRegion = value.substring(vend, jstart - 1);
                    jRegion = '<text style="color: #377eb8">' + value.substring(jstart - 1, value.length) + '</text>';
                    value = vRegion + otherRegion + jRegion;
                }
            }
            if (columnName === 'gene') {
                var prefix = '';
                if (entries[0].value != 0) {
                    prefix = '<i class="fa cursor_pointer" ng-class="{\'fa-plus\':!isComplexParent(row) && !isComplex(row), \'fa-minus\':isComplexParent(row)}" aria-hidden="true" ' +
                        'ng-click="::clickRow(rowIndex, row)"></i>';
                } else {
                    prefix = '<i class="fa fa-plus cursor_pointer" style="color: #D3D3D3;" ng-click="::clickRow(rowIndex, row)"></i>'
                }
                if (typeof showComplex != "undefined" && showComplex === false) prefix = '';
                switch (value) {
                    case 'TRA':
                        value = prefix + '<text class="tra_text_color">' + value + '</text>';
                        break;
                    case 'TRB':
                        value = prefix + '<text class="trb_text_color">' + value + '</text>';
                        break;
                    default:
                }
            }
            if (dataType === 'url') {
                if (value.indexOf('PMID') >= 0) {
                    var id = value.substring(5, value.length);
                    value = 'PMID:<a href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id + '" target="_blank">' + id + '</a>'
                } else if (value.indexOf('http') >= 0) {
                    var domain;
                    //find & remove protocol (http, ftp, etc.) and get domain
                    if (value.indexOf("://") > -1) {
                        domain = value.split('/')[2];
                    } else {
                        domain = value.split('/')[0];
                    }
                    //find & remove port number
                    domain = domain.split(':')[0];
                    value = '<a href="' + value  + '">' + domain + '</a>'
                }
            } else if (dataType.indexOf('json') >= 0) {
                try {
                    var comment = JSON.parse(value);
                    var text = "";
                    var color_i = 'black';
                    angular.forEach(Object.keys(comment).sort(), function (propertyName) {
                            if (comment[propertyName] !== "") {
                                text += '<p>' + propertyName + ' : ' + comment[propertyName] + '</p>';
                            }
                    });

                    //#1a9641 - green
                    //#a6d96a - light green
                    //#dde927 - yellow
                    //#fdae61 - orange
                    //#d7191c - red

                    if (columnName == 'cdr3fix') {
                        var FixNeeded = (comment['fixNeeded'] === true);
                        var ChangeSegment = false
                        var ChangeSequence = false
                        var Failed = false

                        angular.forEach(comment, function(field) {
                            Failed = String(field).indexOf('Failed') !== -1 || Failed;
                            ChangeSegment = String(field).indexOf('ChangeSegment') !== -1 || ChangeSegment;
                            ChangeSequence = String(field).indexOf('ChangeSequence') !== -1 || ChangeSequence;
                        })

                        //console.log(Failed)

                        if (Failed) {
                            color_i = '#d7191c';
                        } else if (ChangeSequence) {
                            color_i = '#fdae61';
                        } else if (ChangeSegment) {
                            color_i = '#dde927';
                        } else if (FixNeeded) {
                            color_i = '#a6d96a';
                        } else {
                            color_i = '#1a9641';
                        }

                    }

                    value = '<div class="row_popover" style="width: 100%; height: 100%;" tab-index="0" ' +
                        'data-trigger="hover" data-toggle="popover" data-placement="left" ' +
                        'title="' + columnMeta.title + '" data-content="' + text + '" clip-copy="copyToClip(\'' + text + '\')"' + ' data-animation="false" '+
                        'clip-click-fallback="clipNoFlash(\'' + text + '\')" clip-click="copyToClipNotification()"><i style="color: ' + color_i + '" class="fa fa-info-circle comments-control"></i></div>'
                } catch (e) {
                    value = ''
                }
            }
            return value;
        }

        function isEntryVisible(entry) {
            return columnByName(entry.columnName).metadata.visible !== "0"
        }

        function columnHeader(column) {
            return '<div class="column_popover" data-trigger="hover" data-toggle="popover" data-placement="top" data-content="' +
                column.metadata.comment + '">' + column.metadata.title + '</div>';
        }

        function columnComment(column) {
            return column.metadata.comment;
        }

        function isColumnVisible(column) {
            return column.metadata.visible !== "0"
        }

        return {
            getColumns: getColumns,
            getVisibleColumns: getVisibleColumns,
            getColumnsLength: getColumnsLength,
            setColumns: setColumns,
            entryValue: entryValue,
            isEntryVisible: isEntryVisible,
            columnHeader: columnHeader,
            isColumnVisible: isColumnVisible,
            columnByName: columnByName
        }
    })

}());