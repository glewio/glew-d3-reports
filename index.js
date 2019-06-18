'use strict';

const glew = {

  reportError: function(msg) {
    $("<h1 class='mode-error'>").text(msg).prependTo(document.body);
  },

  getColumnsFromQuery: function(queryName) {
    var columns = datasets.filter(function(d) {
      if (d) {
        return d.queryName == queryName;
      };
    })[0];
    if (!columns) {
      glew.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return columns.columns
  },

  getDataFromQuery: function(queryName) {
    var data = datasets.filter(function(d) {
      if (d) {
        return d.queryName == queryName;
      };
    })[0];
    if (!data) {
      glew.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return data.content;
  },

  stackedBarChart: function(params = {}) {
    if (params === 'Define Params') {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        dataFormat: 'The query should return 3 columns, the_date, a grouping (ie the "stacks"), and the value to be returned.  For example, the_date, channels, orders',
        colorArr: 'Array: An array of color values (hex or rgb) that you\'d like to use for the stacked bars.  Default is the Glew color theme',
        yAxisLabel: 'String: The label of the yAxis.  Defaults to empty string',
        margins: 'Object: An object with top, right, bottom, and left keys.  These are the margins of the report within the outter svg',
        xAxisValue: 'String: The column name in the query for the xAxis.Default value is "the_date"',
        yAxisValue: 'String: The column name in the query for the yAxis. Default value is "values"',
        stack: 'String: The column name in the query for the stacks (ie groupings). Default value is "channel"',
        divID: 'String: The selector (id) of the div that\'s going to contain the chart.  By the way, you need to add a div with an id that will wrap the chart.  Default is "#d3-bar"',
        timeParseFormat: 'String: The format of the time your query returns (https://github.com/d3/d3-time-format). Default is "%Y-%m-%d"',
        timeFomat: 'String: The time format you want to display on your bar graph (https://github.com/d3/d3-time-format).  Default is "%b %e, %Y"',
        outterWidth: 'Int: The "outter" width (in px) of your bar chart (the chart will be this - margins.left - margins.right).  Default is 1080',
        outterHeight: 'Ing: The "outter" height (in px) of your bar chart (the chart will be this - margins.top - margins.bottom).  Default is 600'
      });
      return;
    }
    const {
      queryName,
      colorArr = ['#2196F3', '#7168F2', '#00B8CC', '#55E0AA', '#FFB300', '#FF525E', '#8EA2AC', 'rgb(255, 152, 150)', 'rgb(148, 103, 189)', 'rgb(197, 176, 213)', 'rgb(140, 86, 75)', 'rgb(196, 156, 148)', 'rgb(227, 119, 194)', 'rgb(250, 175, 250)', 'rgb(255, 238, 0)', 'rgb(252, 163, 45)', 'rgb(15, 22, 219)', 'rgb(15, 219, 196)'],
      yAxisLabel = '',
      margins = {
        top: 80,
        right: 30,
        bottom: 70,
        left: 80
      },
      xAxisValue = 'the_date',
      yAxisValue = 'values',
      stack = 'groups',
      divSelector = '#d3-bar',
      timeParseFormat = '%Y-%m-%d',
      timeFomat = '%b %e, %Y',
      outterWidth = 1150,
      outterHeight = 400,
    } = params;

    // Convert date from string to Date Obj
    const parseDate = d3.timeParse(timeParseFormat);
    // Convert date from DateObj to String
    const formatDate = d3.timeFormat(timeFomat);
    // const rawData = datasets.find(d => d.queryName === queryName);
    const rawData = glew.getDataFromQuery(queryName);

    const totals = rawData.reduce((acc, cur) => {
      const curChan = cur[stack];
      return Object.keys(acc).includes(curChan) ? { ...acc,
        [curChan]: acc[curChan] += cur.orders
      } : { ...acc,
        [curChan]: cur.orders
      }
    }, {});

    const groupingSorted = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

    const pivotedData = rawData.reduce((acc, cur) => {
      const exist = acc.find(c => c.date === cur[xAxisValue])
      if (exist) {
        exist[cur[stack]] = cur[yAxisValue];
        return acc;
      } else {
        return [...acc, {
          date: cur[xAxisValue],
          [cur[stack]]: cur[yAxisValue]
        }];
      }
    }, []);

    const dataFinal = pivotedData.map(d => {
      const obj = {
        date: d.date
      }
      const finalObj = groupingSorted.reduce((acc, cur) => {
        return { ...acc,
          [cur]: d[cur] || 0
        }
      }, obj);
      return finalObj
    });

    const dates = rawData.reduce((acc, cur) => {
      return acc.includes(cur[xAxisValue]) ?
        acc : [...acc, cur[xAxisValue]]
    }, []).map(d => parseDate(d));

    const stacked = d3.stack().keys(groupingSorted)(dataFinal);
    const dailyTotals = stacked[0].map(d => {
      const date = d.data.date;
      const totals = Object.keys(stack).reduce((acc, cur) => acc + stack[cur], 0);
      return {
        date,
        totals
      }
    }, {})

    const width = outterWidth - margins.right - margins.left;
    const height = outterHeight - margins.top - margins.bottom;

    const svg = d3.select(divSelector).append('svg')
      .attr('id', 'bar-chart')
      .attr("width", width + margins.left + margins.right)
      .attr("height", height + margins.top + margins.bottom)

    const chart = svg.append("g")
      .attr('class', 'chart-area')
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")")

    let legend = svg.append('g')
      .attr('class', 'bar-legend')
      .attr('transform', `translate(${width/2}, 0)`)

    let x = d3.scaleBand().rangeRound([0, width])
    let y = d3.scaleLinear().range([height, 0]);

    let color = d3.scaleOrdinal()
      .domain(groupingSorted)
      .range(colorArr);

    // Axis groups
    let xAxis = chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)

    let yAxis = chart.append('g')
      .attr('class', 'y-axis');

    yAxis.append('text')
      .attr('class', 'axis-title')
      .attr('y', height / 2)
      .attr('x', -35)
      .attr('dy', '1.1em')
      .style('text-anchor', 'end')
      .attr('fill', 'black')
      .text(yAxisValue);

    let stackedBarTooltip = d3.select(divSelector)
      .append("div")
      .attr("class", "stackedBar-tooltip-outter-div")
      .style("display", "none")

    // gridlines in x axis function
    function make_x_gridlines() {
      return d3.axisBottom(x)
      // .ticks(5)
    }

    // gridlines in y axis function
    function make_y_gridlines() {
      return d3.axisLeft(y)
        .ticks(5)
    }

    chart.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(make_x_gridlines()
        .tickSize(-height, 0, 0)
        .tickFormat("")
      )

    // add the Y gridlines
    chart.append("g")
      .attr("class", "grid")
      .style("stroke-dasharray", ("3, 3"))
      .call(make_y_gridlines()
        .tickSize(-width, 0, 0)
        .tickFormat("")
      )

    groupingSorted.forEach((c, i) => {
      // Add a row for each item with a space of 20px
      const strLength = c.length;
      let legendRow = legend.append('g')
      let cName = c.replace(/\s+/g, '_')
      if (i < 5) {

        legendRow
          .attr('transform', `translate(${i * 110}, 20)`)

        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `stackedBar-legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            // console.log('AllDisplayed: ', allDisplayed)
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))

            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }
            const allDisplayed = $('.stackedBar-legend-dot').map(function() {
              if ($(this).hasClass('display')) {
                return $(this).siblings().text()
              }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = {
                date: d.date
              };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      } else if (i < 10) {
        legendRow
          .attr('transform', `translate(${(i-5) * 110}, 35)`)
        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `stackedBar-legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))
            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }

            const allDisplayed = $('.stackedBar-legend-dot').map(function() {
              if ($(this).hasClass('display')) {
                return $(this).siblings().text()
              }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = {
                date: d.date
              };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      } else {
        legendRow
          .attr('transform', `translate(${(i-10) * 110}, 50)`)

        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `stackedBar-legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))
            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }
            const allDisplayed = $('.stackedBar-legend-dot').map(function() {
              if ($(this).hasClass('display')) {
                return $(this).siblings().text()
              }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = {
                date: d.date
              };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      }
    });

    let barChart = chart.append('g');

    function update(data) {
      // console.log('Data: ', data)
      const dates = data[0].map(d => parseDate(d.data.date))
      const dailyTotals = data[0].map(d => {
        const {
          date,
          ...channels
        } = d.data;
        const totals = Object.keys(channels).reduce((acc, cur) => acc + channels[cur], 0);
        return {
          date,
          totals
        }
      }, {})

      x.domain(dates)
      y.domain([0, d3.max(dailyTotals, d => d.totals)]).nice()

      let xAxisCall = d3.axisBottom()
        .tickFormat(formatDate)
        .tickValues(x.domain().filter(function(d, i) {
          return !(i % 4)
        }));

      let yAxisCall = d3.axisLeft()
        .ticks(6)
        .tickFormat(function(d) {
          // console.log('D in tick format: ', d)
          return d;
        });

      // Generate axes onces scales have been set
      xAxis.transition(d3.transition().duration(750)).call(xAxisCall.scale(x));
      yAxis.transition(d3.transition().duration(750)).call(yAxisCall.scale(y));


      let barsSelection = barChart.selectAll('g')
        .data(data, (d, i) => {
          return i
          // return d.key // Interesting transition with this
        })

      let barsJoined = barsSelection
        .join('g')
        .attr('class', d => `${d.key}-layer`)
        .attr('fill', d => color(d.key))

      let bars = barsJoined
        .selectAll("rect")
        .data(d => d)

      bars.exit().remove()

      let drawnBars = bars
        .enter().append("rect")
        .merge(bars)
        .attr("y", () => height)
        .attr("height", 0)

      drawnBars
        .transition()
        .duration(750)
        .attr("x", function(d) {
          return x(parseDate(d.data.date));
        })
        .attr("height", function(d, i) {
          return y(d[0]) - y(d[1]);
        })
        .attr("y", function(d) {
          return y(d[1]);
        })
        .attr("width", width / data[0].length - 5)

      drawnBars
        .on("mouseout", function() {
          stackedBarTooltip.style("display", "none");
        })
        .on("mouseover", function(d) {
          let yPos = d3.event.pageY - document.getElementById("d3-bar").getBoundingClientRect().y + 10
          var coordinates= d3.mouse(this);
          const xPos = coordinates[0];
          const yPos2 = coordinates[1];
          const {
            data
          } = d
          let [lower, upper] = d;
          const {
            date,
            ...channels
          } = data;
          const channelNames = Object.keys(channels);
          const values = channelNames.map(c => channels[c]);
          const runningTotal = channelNames.map((c, i) => ({
            [c]: d3.sum(values.slice(0, i + 1))
          }))
          const curChannelObj = runningTotal.find(c => {
            return Object.values(c) > lower && Object.values(c) <= upper
          });
          const curChannel = Object.keys(curChannelObj)[0];
          const total = Object.keys(channels).reduce((acc, cur) => acc + d.data[cur], 0)
          const tipString = Object.keys(channels).reduce((acc, cur) => {
            return `
            ${acc}
            <div class="stackedBar-tip-body-${cur} ${cur === curChannel ? 'stackedBar-tip-body-selected' : ''}">
              <div class="stackedBar-tip-body-channel-color" style="background: ${color(cur)}"></div>
              <div class="stackedBar-tip-body-channel tip-body-channel-${cur}">${cur}</div>
              <div class="stackedBar-tip-body-orders">${channels[cur]} (${((channels[cur] / total) *100).toFixed(1)}%)</div>
            </div>
            `
          }, '');
          let xCord = x(parseDate(date)) + 115; // If it's much less than this, it flickers
          stackedBarTooltip
            .style("left", xCord + "px")
            .style('bottom', (height - yPos2) + 'px')
            .style("display", "block")
            .html(function() {
              return `
                <div class="stackedBar-tip-header">${formatDate(parseDate(date))}</div>
                <div class="stackedBar-tip-body">${tipString}</div>
                <div class="stackedBar-tip-totals">
                  <div class="stackedBar-tip-totals-row">
                    <div class="stackedBar-tip-body-channel-color"></div>
                    <div class="stackedBar-tip-body-channel stackedBar-tip-body-channel-total">Total</div>
                    <div class="stackedBar-tip-body-orders">${total}</div>
                  </div>
                </div>
            `
            });
        })
      // barsSelection.exit.remove();
    }

    update(stacked)
  },

  popLineGraph: function(params = {}) {
    if (params === 'Define Params') {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        dataFormat: 'The query should return 3 columns: period (should have 2 values. For example, "current" and "previous"), x-value, and the y-value to be returned.  For example, period, the_date, orders',
        yAxisLabel: 'String: The label of the yAxis.  Defaults to empty string',
        margins: 'Object: An object with top, right, bottom, and left keys.  These are the margins of the report within the outter svg',
        xAxisValue: 'String: The column name in the query for the xAxis. Default value is "the_date"',
        yAxisValue: 'String: The column name in the query for the yAxis. Default value is "values"',
        period1: 'String: The value of the most recent period.  Default value is "current"',
        period2: 'String: The value of the previous period.  Default value is "previous"',
        divSelector: 'String: The selector (id or class) of the div that\'s going to contain the chart.  By the way, you need to add a div with an id that will wrap the chart.  Default is "#d3-bar"',
        timeParseFormat: 'String: The format of the time your query returns (https://github.com/d3/d3-time-format). Default is "%Y-%m-%d"',
        timeFomat: 'String: The time format you want to display on your bar graph (https://github.com/d3/d3-time-format).  Default is "%b %e, %Y"',
        outterWidth: 'Int: The "outter" width (in px) of your bar chart (the chart will be this - margins.left - margins.right).  Default is 1080',
        outterHeight: 'Ing: The "outter" height (in px) of your bar chart (the chart will be this - margins.top - margins.bottom).  Default is 600'
      });
      return;
    }

    const {
      queryName,
      colorArr = ['#2196F3', '#7168F2', '#00B8CC', '#55E0AA', '#FFB300', '#FF525E', '#8EA2AC', 'rgb(255, 152, 150)', 'rgb(148, 103, 189)', 'rgb(197, 176, 213)', 'rgb(140, 86, 75)', 'rgb(196, 156, 148)', 'rgb(227, 119, 194)', 'rgb(250, 175, 250)', 'rgb(255, 238, 0)', 'rgb(252, 163, 45)', 'rgb(15, 22, 219)', 'rgb(15, 219, 196)'],
      yAxisLabel = '',
      margins = {
        top: 80,
        right: 30,
        bottom: 70,
        left: 80
      },
      xAxisValue = 'the_date',
      yAxisValue = 'values',
      period1 = 'current',
      period2 = 'previous',
      divSelector = '#d3-line',
      timeParseFormat = '%Y-%m-%d',
      timeFomat = '%b %e, %Y',
      outterWidth = 1150,
      outterHeight = 400,
    } = params;

    // Convert date from string to Date Obj
    const parseDate = d3.timeParse(timeParseFormat);
    // Convert date from DateObj to String
    const formatDate = d3.timeFormat(timeFomat);
    // Bisector for where to display the tooltip
    const bisectDate = d3.bisector(function(d) {
      return d.x;
    }).left;

    // Get data and manipulate to get into correct format
    const rawData = glew.getDataFromQuery(queryName);
    // Get the dates for the current period
    const curData = rawData.filter(d => d.period === period1).map(d => ({
      period: period1,
      x: parseDate(d[xAxisValue]),
      y: d[yAxisValue]
    }));
    const prevData = rawData.filter(d => d.period === period2).map(d => ({
      period: period2,
      x: parseDate(d[xAxisValue]),
      y: d[yAxisValue]
    }));
    const dates = curData.map(d => d.x);

    // Joint data has the format [{ date: curDate, prevDate: prevDate, values: {cur: currentOrders, prev: previousOrders }}, ...]
    const jointData = curData.map((d, i) => {
      return {
        x: d.x,
        prevX: prevData[i].x,
        value: {
          cur: d.y,
          prev: prevData[i].y
        }
      }
    });

    const width = outterWidth - margins.right - margins.left;
    const height = outterHeight - margins.top - margins.bottom;

    // Set up the svg canvas by
    // 1. selecting the div (by id)
    // 2. appending an SVG tag
    // 3. setting some attributes (width and height mandatory)
    const svg = d3.select(divSelector).append('svg')
      .attr('id', 'line-chart')
      .attr("width", width + margins.left + margins.right)
      .attr("height", height + margins.top + margins.bottom)
    // 1. appending a g tag to the svg
    // 2. moving the top left corner away from the top corner of the canvas
    const chart = svg.append("g")
      .attr('class', 'chart-area')
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

    // Overlay for finding mouse coordinates
    svg.append("rect")
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .on("mouseover", function() {
        focus.style("display", null);
        focus2.style('display', null);
      })
      .on("mouseout", function() {
        popLineChartTooltip.style("display", "none");
      })
      .on("mousemove", mousemove)


    // Tooltip code adapted from https://bl.ocks.org/alandunning/cfb7dcd7951826b9eacd54f0647f48d3
    let focus = chart.append("g")
      .attr("class", "pop-line-focus")
      .style("display", "none");

    let focus2 = chart.append("g")
      .attr("class", "pop-line-focus2")
      .style("display", "none");

    focus.append("line")
      .attr("class", "x-hover-line hover-line")
      .attr("y1", 0)
      .attr("y2", height);

    focus.append("line")
      .attr("class", "y-hover-line hover-line")
      .attr("x1", width)
      .attr("x2", width);

    focus.append("circle")
      .attr('class', 'focus-circle')
      .attr("r", 7.5);

    focus2.append("circle")
      .attr('class', 'focus2-circle')
      .attr("r", 7.5);

    focus.append("text")
      .attr("x", 15)
      .attr("dy", ".31em");

    let popLineChartTooltip = d3.select(divSelector)
      .append("div")
      .attr("class", "popLineChart-tooltip-outter-div")
      .style("display", "none")

    // Set x and y scales
    let x = d3.scaleTime()
      .domain(d3.extent(dates)) // extent gets the min and max
      .range([0, width]);

    let y = d3.scaleLinear()
      .domain([0, d3.max(rawData, d => d[yAxisValue])]).nice()
      .range([height, 0]);

    let xAxisCall = d3.axisBottom()
    let yAxisCall = d3.axisLeft()
      .ticks(6)
      .tickFormat(function(d) {
        // console.log('D in tick format: ', d)
        return d;
      });

    // Axis groups
    let xAxis = chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`);

    let yAxis = chart.append('g')
      .attr('class', 'y-axis');

    yAxis.append('text')
      .attr('class', 'axis-title')
      .attr('y', height / 2)
      .attr('x', -35)
      .attr('dy', '1.1em')
      .style('text-anchor', 'end')
      .attr('fill', 'black')
      .text(yAxisLabel);



    // Generate axes onces scales have been set
    xAxis.call(xAxisCall.scale(x))
    yAxis.call(yAxisCall.scale(y))

    let curLine = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.value.cur));

    let prevLine = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.value.prev));

    // define the area
    let curArea = d3.area()
      .x(d => x(d.x))
      .y0(height)
      .y1(d => y(d.value.cur));

    let prevArea = d3.area()
      .x(d => x(d.x))
      .y0(height)
      .y1(d => y(d.value.prev));

    // gridlines in x axis function
    function make_x_gridlines() {
      return d3.axisBottom(x)
        .ticks(5)
    }

    // gridlines in y axis function
    function make_y_gridlines() {
      return d3.axisLeft(y)
        .ticks(5)
    }


    function update(data) {
      let curPoint = chart.selectAll('.cur-point')
        .data(data, d => d.x)

      curPoint
        .enter()
        .append('circle')
        .merge(curPoint)
        .classed('cur-point', true)
        .attr('r', 2)
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.value.cur))

      curPoint.exit().remove();

      let prevPoint = chart.selectAll('.prev-point')
        .data(data, d => d.x)

        // prevPoint
        .enter()
        .append('circle')
        .merge(curPoint)
        .classed('prev-point', true)
        .attr('r', 2)
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.value.prev))

      prevPoint.exit().remove();

      chart.append('path')
        .attr('class', 'cur-line')
        .attr('d', curLine(data));

      chart.append('path')
        .attr('class', 'prev-line')
        .attr('d', prevLine(data));

      // add the curArea
      chart.append("path")
        .data([data])
        .attr("class", "cur-area")
        .attr("d", curArea);

      chart.append("path")
        .data([data])
        .attr("class", "prev-area")
        .attr("d", prevArea);

      // add the X gridlines
      chart.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(make_x_gridlines()
          .tickSize(-height, 0, 0)
          .tickFormat("")
        )

      // add the Y gridlines
      chart.append("g")
        .attr("class", "grid")
        .style("stroke-dasharray", ("3, 3"))
        .call(make_y_gridlines()
          .tickSize(-width, 0, 0)
          .tickFormat("")
        )

    }

    update(jointData)

    function mousemove() {
      let x0 = x.invert(d3.mouse(this)[0]);
      let i = bisectDate(jointData, x0, 1);
      let d0 = jointData[i - 1];
      let d1 = jointData[i];
      let d = x0 - d0.x > d1.x - x0 ? d1 : d0;

      focus.attr("transform", "translate(" + x(d.x) + 200 + "," + y(d.value.cur) + ")");
      focus2.attr("transform", "translate(" + x(d.x) + 200 + "," + y(d.value.prev) + ")");
      var coordinates = d3.mouse(this);
      const xPos = coordinates[0];
      const yPos2 = coordinates[1];
      popLineChartTooltip
        .style("left", x(d.x) + 115 + "px")
        .style("bottom", (height - yPos2) + 20 + "px")
        // .style("bottom", y(d.value.prev) - y(d.value.cur) + "px")
        .style('display', 'block')
        .html(function() {
          return `
            <div class="popLineChart-tip-header">Details</div>
            <div class="popLineChart-tip-body">
              <div class="popLineChart-tip-body-cur">
                <div class="popLineChart-tip-body-cur-circle"></div>
                <div class="popLineChart-tip-body-cur-date">${formatDate(d.x)}</div>
                <div class="popLineChart-tip-body-cur-value">${d.value.cur}</div>
              </div>
              <div class="popLineChart-tip-body-prev">
                <div class="popLineChart-tip-body-prev-circle"></div>
                <div class="popLineChart-tip-body-prev-date">${formatDate(d.prevX)}</div>
                <div class="popLineChart-tip-body-prev-value">${d.value.prev}</div>
              </div>
            </div>`
        });

      focus.select(".x-hover-line").attr("y2", height - y(d.value.cur));
      focus.select(".y-hover-line").attr("x2", width + width);
    }
  },

  createGlewTable: function (params = {}) {
    if (params === 'Define Params') {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        initialData: 'Array: If you want to pass in your dataset rather than the query name',
        columnMap: 'Object: An object of the format { query_column_header: { display: "Desired Column Header", type: "Optional, mainly used if value is string or date", format: "format of value from d3.format (if param IS NOT A DATE), currentFormat: "Only used if type: date.  d3.timeParse format used to parse a string to a date object", displayFomat: "Only used if type: date.  d3.timeFormat format used to convert date object to string.',
        tableId: 'String: TableID of Mode table that you\'re targeting ',
        initialSort: 'String: The initial column to sort on',
        removeTitle: 'Bool: If you want to remove the Mode table title',
        displayTotals: 'Bool: If you want to display totals',
        totalsData: 'Array: Totals data to display',
        totalsLocation: 'Enum (bottom, top): IF you want to have the totals at the bottom or top of the table',
      });
      return;
    }


   const {
      queryName,
      initialData,
      columnMap,
      tableId,
      initialSort,
      removeTitle = false,
      displayTotals = false,
      totalsData = [],
      totalsLocation = 'bottom',
    } = params;

    if ((queryName === undefined && initialData === undefined) || columnMap ===  undefined) {
      // TODO: Have some better error handling here
      return;
    }

    const tableSkeleton = `
      <div id="js-table">
        <table>
          <thead class="js-table-head">
            <tr class="table-head-row"></tr>
          </thead>
          <tbody class="js-table-body"></tbody>
        </table>
      </div>
      <div class="table_footer">
        <div class="footer">
          <div class="show_dropdown">
            <span>Show</span>
            <select id="num_results">
              <option value="10">10</option>
              <option selected="" value="20">20</option>
              <option value="30">30</option>
              <option value="40">40</option>
              <option value="50">50</option>
            </select>
            <span>entries</span>
          </div>
          <div class="show_text">
            <span>Showing</span>
            <span id="entries_summary">Insert Stuff Here</span>
            <span>entries</span>
          </div>
          <div class="glew-pagination">
            <span>Page</span>
            <select id="page_number">
              <option selected="" value="1">1</option>
            </select>
          </div>
        </div>
      </div>
    `

    // Remove the Mode table contents and replace with our structure
    if (removeTitle) {
      $(`#${tableId} .chart-header`).remove();
    }
    $(`#${tableId} .js-table-container`).empty();
    $(`#${tableId} .js-table-container`).append(tableSkeleton);

    const columnObj = glew.getColumnsFromQuery(queryName);
    const columns = columnObj.map(c => c.name);
    const data = initialData
      ? initialData
      : glew.getDataFromQuery(queryName);
    let totalResults = data.length;
    let sortAscending = true;
    let num_results = $('#num_results').val()
    const pages = data.length / num_results;
    let selected_page = $('#page_number').val();
    let start = (selected_page - 1) * num_results;
    let displayData = data.slice(start, num_results * selected_page);
    let sortedRow = initialSort
    // Set the number of available pages
    for (i = 2; i <= pages; i++) {
      $('#page_number').append($("<option />").val(i).text(i));
    }
    let startResults = (selected_page - 1) * +num_results;
    let endResults = +selected_page * +num_results;
    let entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
    $("#entries_summary").text(entriesSummary)

    Object.keys(columnMap).forEach(c => {
      $('.table-head-row').append($(`
        <th class=${c}>
          <div class="layout-row ${c}">
            <span class=${c}>${columnMap[c].display}</span>
            <div class="toggles">
              <i class="material-icons">arrow_drop_up</i>
              <i class="material-icons">arrow_drop_down</i>
            </div>
          </div>
        </th>`));
      // $('.table-head-row').append($(`<th>${c}</th>`));

    });

    $('.table-head-row th').click((cell) => {
      const cellClass = $(cell)[0].target.className;
      const sortBy = cellClass.replace('selected', '').replace('layout-row', '').trim()
      if (sortBy !== sortedRow) {
        sortedRow = sortBy;
      }

      const sorted = displayData.sort((a, b) => {
        const type = columnMap[sortBy].type
        if (type === 'string') {
          const aName = a[sortBy].toUpperCase();
          const bName = b[sortBy].toUpperCase();

          if (aName < bName) {
            return sortAscending ?
              -1 :
              1
          }
          if (aName >= bName) {
            return sortAscending ?
              1 :
              -1
          }
        } else if (type === 'date') {
            const parseTime = d3.timeParse(columnMap[sortBy].currentFormat);
            const formatTime = d3.timeFormat(columnMap[sortBy].displayFormat);
            const aparsed = parseTime(a[sortBy])
            const bparsed = parseTime(b[sortBy])
          return sortAscending
            ? aparsed - bparsed
            : bparsed - aparsed
        } else {
          return sortAscending
            ? a[sortBy] - b[sortBy]
            : b[sortBy] - a[sortBy]
        }
      });
      sortAscending = !sortAscending
      generateTable(sorted, sortedRow);

    });


    function generateTable(data, sortBy, ) {
      $('.js-table-body').children().remove();
      const t = data.map(r => {
        // const row = Object.keys(r).map(d => {
        const row = Object.keys(columnMap).map(d => {
          let format = columnMap[d].format || ',';
          let fmt;
          let formatted
          if (columnMap[d].type === 'date') {
            const parseTime = d3.timeParse(columnMap[d].currentFormat);
            const formatTime = d3.timeFormat(columnMap[d].displayFormat);
            const parsed = parseTime(r[d])
            formatted = formatTime(parsed);

          } else {
            fmt = d3.format(format);
            formatted = columnMap[d].type === 'text' ?
              r[d] :
              fmt(r[d]);
          }

          let td = `<td class="${d}"><div>${formatted}</div></td>`
          return td
        }).reduce((acc, cur) => {
          return `${acc}${cur}`
        })

        return row;
      }).reduce((acc, cur, i) => {
        if (i === 1) {
          return `<tr class='js-table-row first-row'>${acc}</tr><tr class='js-table-row'>${cur}</tr>`
        } else {
          const row = `<tr class='js-table-row'>${cur}</tr>`
          return `${acc}${row}`
        }
      })
      $('.js-table-body').append(t)
      if (sortBy !== null && sortBy !== undefined) {
        setSelected(sortBy);
      }
      if (displayTotals) {
        // TODO: Write a function that calculates totals if no data provided
        addTotalsRow(totalsData);
      }

    }

    generateTable(displayData, sortedRow);

    function setSelected(selection) {
      const dir = sortAscending ? 'sort_desc' : 'sort_asc';
      $('.selected').removeClass('selected');
      $(`.${selection}`).each(function() {
        $(this).addClass('selected')
      });

    }

    function addTotalsRow(totalsAr) {
      $('.js-table-body').children();
      const t = totalsAr.map((r, i) => {
        const row = Object.keys(columnMap).map(d => {
          let format = columnMap[d].format || ',';
          let fmt = d3.format(format);
          let formatted = columnMap[d].type === 'text' ?
            r[d] :
            fmt(r[d]);
          let td = `<td class="totals ${d}"><div>${formatted}</div></td>`
          return td
        }).reduce((acc, cur) => {
          return `${acc}${cur}`
        })
        return row;
      }).reduce((acc, cur, i) => {
        if (i === 1) {
          return `<tr>${acc}</tr><tr>${cur}</tr>`
        } else {
          const row = `<tr>${cur}</tr>`
          return `${acc}${row}`
        }
      })
      if (totalsLocation === 'bottom') {
        // Add totals to the bottom
        $('.js-table-body').append(t)
      } else {
        // table = $(id + " .main-table")
        // container = $(id + " .js-table-content-container")
        // var firstRow = table.find("tr:first")
        // var totalRow = makeRow(totals)
        // var tableHeight = container.css("height")
        // var tableHeightInt = +tableHeight.match(/\d+/)[0]
        // firstRow.after(totalRow)
      }
    }


    $('#page_number').change(function() {
      selected_page = $('#page_number').val();
      num_results = $('#num_results').val()
      endResults = +selected_page * +num_results;
      entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
      $("#entries_summary").text(entriesSummary)
      start = (selected_page - 1) * num_results;
      displayData = data.slice(start, num_results * selected_page);
      generateTable(displayData);
    });
    $('#num_results').change(function() {
      selected_page = $('#page_number').val();
      num_results = $('#num_results').val();
      endResults = +selected_page * +num_results;
      entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
      $("#entries_summary").text(entriesSummary)
      start = (selected_page - 1) * num_results;
      displayData = data.slice(start, num_results * selected_page);
      generateTable(displayData);
      const pages = Math.ceil(data.length / num_results);
      for (i = 2; i <= pages; i++) {
        $('#page_number').append($("<option />").val(i).text(i));
      }
    });
  },

  createGlewCard: function(params = {}) {
    if (params === 'Define Params' || params == {}) {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        fmt: 'String: The d3 format you want for the Center, Top Left and Top Right metrics',
        bottomFormat: 'String: The d3 format you want for the Bottom Left and Bottom Right metrics. If you want to define these individually, you can do so in the bottomLeft and bottomRight objects',
        chartId: 'String: ChartID of Mode Big Number that you\'re targeting ',
        center: 'String: The metric (ie column) in the query that you\'re targeting. This will also be the title of the card',
        topLeft: 'Obj w/ params row(String) and label(String).  The Row is the row you\'re trageting in the query and the Label is what text you want displayed on the card below the metric',
        topRight: 'Obj w/ params row(String) and label(String).  The Row is the row you\'re trageting in the query and the Label is what text you want displayed on the card below the metric',
        bottomLeft: 'Obj w/ params row(String) and label(String) and optional fmt(String).  The Row is the row you\'re trageting in the query, the Label is what text you want displayed on the card below the metric and the fmt, if present (and bottomFmt is null) is the formatting applied to the value',
        bottomRight: 'Obj w/ params row(String) and label(String) and optional fmt(String).  The Row is the row you\'re trageting in the query, the Label is what text you want displayed on the card below the metric and the fmt, if present (and bottomFmt is null) is the formatting applied to the value',
      });
      return;
    }
    const cardFmt = params.fmt;
    const bottomFmt = params.bottomFormat;
    const bfmt = bottomFmt && d3.format(bottomFmt);
    const fmt = d3.format(cardFmt);
    const rawData = datasets.find(d => d.queryName === params.queryName)
    const data = rawData.content
    const cardMetric = params.column

    // Center
    const centerMetric = data.find(d => d.period === params.center.row)[cardMetric]
    const centerMetricFormatted = fmt(centerMetric)

    // Top Left
    const topLeft = data.find(d => d.period === params.topLeft.row)[cardMetric]
    const topLeftFormatted = cardFmt ? fmt(topLeft) : d3.format(params.topLeft.fmt)(topLeft)

    // Bottom Left
    const bottomLeft = data.find(d => d.period === params.bottomLeft.row)[cardMetric]
    const bottomLeftFormatted = bfmt ? bfmt(bottomLeft) : d3.format(params.bottomLeft.fmt)(bottomLeft)

    // Top Right
    const topRight = data.find(d => d.period === params.topRight.row)[cardMetric]
    const topRightFormatted = cardFmt ? fmt(topRight) : d3.format(params.topRight.fmt)(topRight)

    // Bottom Right
    const bottomRight = data.find(d => d.period === params.bottomRight.row)[cardMetric]
    const bottomRightFormatted = bfmt ? bfmt(bottomRight) : d3.format(params.bottomRight.fmt)(bottomRight)

    const cardTitle = params.cardTitle
    const cardString = `
      <div class = "glew-ban-container">
        <div class="title-row">
          <div class="title card-title">${cardTitle}</div>
        </div>
        <div class="row centerMetric-value">
          ${centerMetricFormatted}
        </div>
        <div class="row to-date">
          <div class="topLeft-container">
            <div class="topLeft-val mid-row-val">${topLeftFormatted}</div>
            <div class="topLeft-text card-row-text">${params.topLeft.label}</div>
          </div>
          <div class="topRight-container">
            <div class="topRight-val mid-row-val">${topRightFormatted}</div>
            <div class="topRight-text card-row-text">${params.topRight.label}</div>
          </div>
        </div>
        <div class="row last-row">
          <div class="bottom-left-container">
            <div class="bottom-left-val">
              <img src=${bottomLeft >= 0 ? upArrow : downArrow} class='bottom-left-arrow' alt width='11'>
              <span class="bottom-left-val-span ${bottomLeft >= 0 ? 'up-val' : 'down-val'}">${bottomLeftFormatted}</span>
            </div>
            <div class="bottom-left-text card-row-text">${params.bottomLeft.label}</div>
          </div>
          <div class="bottom-right-container">
            <div class="bottom-right">
              <img src=${bottomRight >= 0 ? upArrow : downArrow} class='avg-arrow' alt width='11'>
              <span class="bottom-right-span ${bottomRight >= 0 ? 'up-val' : 'down-val'}">${bottomRightFormatted}</span>
            </div>
            <div class="bottom-right card-row-text">${params.bottomRight.label}</div>
          </div>
        </div>
      </div>
    `
    $(`#${params.chartId} .chart-big-number`).empty()
    $(`#${params.chartId} .chart-big-number`).append(cardString)
  },

  createGlewTable2: function(params = {}) {
    if (params === 'Define Params') {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        initialData: 'Array: If you want to pass in your dataset rather than the query name',
        columnMap: 'Object: An object of the format { query_column_header: { display: "Desired Column Header", type: "Optional, mainly used if value is string or date", format: "format of value from d3.format (if param IS NOT A DATE), currentFormat: "Only used if type: date.  d3.timeParse format used to parse a string to a date object", displayFomat: "Only used if type: date.  d3.timeFormat format used to convert date object to string.',
        tableId: 'String: TableID of Mode table that you\'re targeting ',
        initialSort: 'String: The initial column to sort on',
        removeTitle: 'Bool: If you want to remove the Mode table title',
        displayTotals: 'Bool: If you want to display totals',
        totalsData: 'Array: Totals data to display',
        totalsLocation: 'Enum (bottom, top): IF you want to have the totals at the bottom or top of the table',
      });
      return;
    }


    const {
      queryName,
      initialData,
      columnMap,
      tableId,
      initialSort,
      removeTitle = false,
      displayTotals = false,
      totalsData = [],
      totalsLocation = 'bottom',
    } = params;

    if ((queryName === undefined && initialData === undefined) || columnMap === undefined) {
      // TODO: Have some better error handling here
      return;
    }

    const tableSkeleton = `
    <div id="js-table">
      <table>
        <thead class="js-table-head">
          <tr class="table-head-row"></tr>
        </thead>
        <tbody class="js-table-body"></tbody>
      </table>
    </div>
    <div class="table_footer">
      <div class="footer">
        <div class="show_dropdown">
          <span>Show</span>
          <select id="num_results">
            <option value="10">10</option>
            <option selected="" value="20">20</option>
            <option value="30">30</option>
            <option value="40">40</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>
        <div class="show_text">
          <span>Showing</span>
          <span id="entries_summary">Insert Stuff Here</span>
          <span>entries</span>
        </div>
        <div class="glew-pagination">
          <span>Page</span>
          <select id="page_number">
            <option selected="" value="1">1</option>
          </select>
        </div>
      </div>
    </div>
  `

    // Remove the Mode table contents and replace with our structure
    if (removeTitle) {
      $(`#${tableId} .chart-header`).remove();
    }
    $(`#${tableId} .js-table-container`).empty();
    $(`#${tableId} .js-table-container`).append(tableSkeleton);

    const columnObj = glew.getColumnsFromQuery(queryName);
    const columns = columnObj.map(c => c.name);
    const data = initialData ?
      initialData :
      glew.getDataFromQuery(queryName);
    let totalResults = data.length;
    let sortAscending = true;
    let num_results = $('#num_results').val()
    const pages = data.length / num_results;
    let selected_page = $('#page_number').val();
    let start = (selected_page - 1) * num_results;
    let displayData = data.slice(start, num_results * selected_page);
    let sortedRow = initialSort
    // Set the number of available pages
    for (i = 2; i <= pages; i++) {
      $('#page_number').append($("<option />").val(i).text(i));
    }
    let startResults = (selected_page - 1) * +num_results;
    let endResults = +selected_page * +num_results;
    let entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
    $("#entries_summary").text(entriesSummary)

    function addClickHandler(columnMap, data, tableId) {
      $(`#${tableId} .table-head-row th`).click((cell) => {
        const cellClass = $(cell)[0].target.className;
        const sortBy = cellClass.replace('selected', '').replace('layout-row', '').trim()
        if (sortBy !== sortedRow) {
          sortedRow = sortBy;
        }
        const sorted = data.sort((a, b) => {
          const type = columnMap[sortBy].type
          if (type === 'text') {
            const aName = a[sortBy].toUpperCase();
            const bName = b[sortBy].toUpperCase();

            if (aName < bName) {
              return sortAscending ?
                -1 :
                1
            }
            if (aName >= bName) {
              return sortAscending ?
                1 :
                -1
            }
          } else if (type === 'date') {
            const parseTime = d3.timeParse(columnMap[sortBy].currentFormat);
            const formatTime = d3.timeFormat(columnMap[sortBy].displayFormat);
            const aparsed = parseTime(a[sortBy])
            const bparsed = parseTime(b[sortBy])
            return sortAscending ?
              aparsed - bparsed :
              bparsed - aparsed
          } else {
            return sortAscending ?
              a[sortBy] - b[sortBy] :
              b[sortBy] - a[sortBy]
          }
        });
        sortAscending = !sortAscending
        generateTable(sorted, sortedRow, tableId);
      });
    }

    function createHeader(columnMap, tableId) {
      const tableHeader = Object.keys(columnMap).reduce((acc, cur) => {
        let curRow = `<th class=${cur}>
          <div class="layout-row ${cur}">
            <span class=${cur}>${columnMap[cur].display}</span>
            <div class="toggles">
              <i class="material-icons">arrow_drop_up</i>
              <i class="material-icons">arrow_drop_down</i>
            </div>
          </div>
        </th>`
        return `${acc}${curRow}`
      }, '');
      $(`#${tableId} .table-head-row`).append($(tableHeader));
    }

    function generateTable(data, sortBy, tableId) {
      $(`#${tableId} .js-table-body`).children().remove();
      const t = data.map(r => {
        // const row = Object.keys(r).map(d => {
        const row = Object.keys(columnMap).map(d => {
          let format = columnMap[d].format || ',';
          let fmt;
          let formatted
          if (columnMap[d].type === 'date') {
            const parseTime = d3.timeParse(columnMap[d].currentFormat);
            const formatTime = d3.timeFormat(columnMap[d].displayFormat);
            const parsed = parseTime(r[d])
            formatted = formatTime(parsed);

          } else {
            fmt = d3.format(format);
            formatted = columnMap[d].type === 'text' ?
              r[d] :
              fmt(r[d]);
          }

          let td = `<td class="${d}"><div>${formatted}</div></td>`
          return td
        }).reduce((acc, cur) => {
          return `${acc}${cur}`
        })
        return row;
      }).reduce((acc, cur, i) => {
        if (i === 1) {
          return `<tr class='js-table-row first-row'>${acc}</tr><tr class='js-table-row'>${cur}</tr>`
        } else {
          const row = `<tr class='js-table-row'>${cur}</tr>`
          return `${acc}${row}`
        }
      })
      $(`#${tableId} .js-table-body`).append(t)
      if (sortBy !== null && sortBy !== undefined) {
        setSelected(sortBy, tableId);
      }
      if (displayTotals) {
        // TODO: Write a function that calculates totals if no data provided
        addTotalsRow(totalsData, tableId);
      }

    }

    createHeader(columnMap, tableId);
    generateTable(displayData, sortedRow, tableId);
    addClickHandler(columnMap, data, tableId);

    function setSelected(selection, tableId) {
      const dir = sortAscending ? 'sort_desc' : 'sort_asc';
      $(`#${tableId} .selected`).removeClass('selected');
      $(`#${tableId} .${selection}`).each(function() {
        $(this).addClass('selected')
      });

    }

    function addTotalsRow(totalsAr, tableId) {
      $(`#${tableId} .js-table-body`).children();
      const t = totalsAr.map((r, i) => {
        const row = Object.keys(r).map(d => {
          let format = columnMap[d].format || ',';
          let fmt = d3.format(format);
          let formatted = columnMap[d].type === 'text' ?
            r[d] :
            fmt(r[d]);
          let td = `<td class="totals ${d}"><div>${formatted}</div></td>`
          return td
        }).reduce((acc, cur) => {
          return `${acc}${cur}`
        })
        return row;
      }).reduce((acc, cur, i) => {
        if (i === 1) {
          return `<tr>${acc}</tr><tr>${cur}</tr>`
        } else {
          const row = `<tr>${cur}</tr>`
          return `${acc}${row}`
        }
      })
      if (totalsLocation === 'bottom') {
        // Add totals to the bottom
        $(`#${tableId} .js-table-body`).append(t)
      } else {
        // table = $(id + " .main-table")
        // container = $(id + " .js-table-content-container")
        // var firstRow = table.find("tr:first")
        // var totalRow = makeRow(totals)
        // var tableHeight = container.css("height")
        // var tableHeightInt = +tableHeight.match(/\d+/)[0]
        // firstRow.after(totalRow)
      }
    }


    $('#page_number').change(function() {
      selected_page = $('#page_number').val();
      num_results = $('#num_results').val()
      let selectedRowEle = $(`#${tableId} table thead th.selected`)[0];
      let selectedRow = selectedRowEle && selectedRowEle.className || initialSort
      let sortCol = selectedRow.replace('selected', '')
      endResults = +selected_page * +num_results;
      entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
      $("#entries_summary").text(entriesSummary)
      start = (selected_page - 1) * num_results;
      let updatedData = data.slice(start, num_results * selected_page);
      console.log('SOrted:', $(`#${tableId} .selected`))
      generateTable(updatedData, sortCol, tableId);
    });
    $('#num_results').change(function() {
      selected_page = $('#page_number').val();
      num_results = $('#num_results').val();
      let selectedRowEle = $(`#${tableId} table thead th.selected`)[0];
      let selectedRow = selectedRowEle && selectedRowEle.className || initialSort
      let sortCol = selectedRow.replace('selected', '')
      console.log('SortCol: ', sortCol);
      endResults = +selected_page * +num_results;
      entriesSummary = `${((selected_page - 1) * num_results) + 1} to ${endResults} of ${totalResults}`
      $("#entries_summary").text(entriesSummary)
      start = (selected_page - 1) * num_results;
      let updatedData = data.slice(start, num_results * selected_page);
      console.log('UpdatedData: ', updatedData);
      generateTable(updatedData, sortCol, tableId);
      const pages = Math.ceil(data.length / num_results);
      for (i = 2; i <= pages; i++) {
        $('#page_number').append($("<option />").val(i).text(i));
      }
    });
  },
}

