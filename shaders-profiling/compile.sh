MALIC="/c/Program Files/Arm/Arm Performance Studio 2026.2/mali_offline_compiler/malioc.exe"

"$MALIC" --opengles ssao.frag -c Mali-G715 > ssao-frag-pixel9.txt
"$MALIC" --opengles ssao.frag -c Mali-G52 > ssao-frag-g52.txt
"$MALIC" --opengles ssao.frag -c Mali-T820 > ssao-frag-t820.txt
