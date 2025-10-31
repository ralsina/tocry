# Working gnuplot script with simple text data files
set terminal pngcairo enhanced color size 800,600 font "Arial,12"

# Response Time Chart
set output 'response_time_chart.png'
set title 'ToCry Response Time vs Concurrency' font ",16,bold"
set xlabel 'Concurrent Users' font ",14"
set ylabel 'Response Time (ms)' font ",14"
set grid front
set key outside right top box opaque
set logscale y 10
set format y '10^{%T}'
set yrange [0.1:100]
set xrange [0:105]

plot 'amd_data.txt' using 1:2 with linespoints title 'AMD Ryzen 5600H' linecolor rgb '#1f77b4' linewidth 3 pointtype 7 pointsize 1.5, \
     'pi4_data.txt' using 1:2 with linespoints title 'Raspberry Pi 4' linecolor rgb '#d62728' linewidth 3 pointtype 5 pointsize 1.5

# Throughput Chart
set output 'throughput_chart.png'
set title 'ToCry Throughput vs Concurrency' font ",16,bold"
set xlabel 'Concurrent Users' font ",14"
set ylabel 'Requests Per Second (RPS)' font ",14"
unset logscale
set yrange [0:8000]
set format y "%.0f"

plot 'amd_data.txt' using 1:3 with linespoints title 'AMD Ryzen 5600H' linecolor rgb '#1f77b4' linewidth 3 pointtype 7 pointsize 1.5, \
     'pi4_data.txt' using 1:3 with linespoints title 'Raspberry Pi 4' linecolor rgb '#d62728' linewidth 3 pointtype 5 pointsize 1.5

# Cost Efficiency Chart
set output 'efficiency_chart.png'
set title 'ToCry Cost Efficiency (RPS per Dollar)' font ",16,bold"
set xlabel 'Concurrent Users' font ",14"
set ylabel 'RPS per Dollar' font ",14"
set yrange [0:40]
set format y "%.1f"

plot 'amd_data.txt' using 1:($3/490) with linespoints title 'AMD Ryzen 5600H ($490)' linecolor rgb '#1f77b4' linewidth 3 pointtype 7 pointsize 1.5, \
     'pi4_data.txt' using 1:($3/75) with linespoints title 'Raspberry Pi 4 ($75)' linecolor rgb '#d62728' linewidth 3 pointtype 5 pointsize 1.5

unset output

print "Charts generated successfully:"
print "- response_time_chart.png"
print "- throughput_chart.png"
print "- efficiency_chart.png"
