#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <cstring>
#include <algorithm>

// Global variable for configuration - Bad practice
bool enable_personalized_ads = true;

struct User {
    int id;
    char username[20]; // Buffer overflow risk
    std::string sensitive_data; // Likely PII stored in plain text
    std::vector<std::string> search_history;
};

class RecommendationEngine {
private:
    std::map<int, User> database;

public:
    void addUser(int id, const char* name, std::string data) {
        User u;
        u.id = id;
        strcpy(u.username, name); // Security: Unsafe copy
        u.sensitive_data = data;
        database[id] = u;
    }

    // Performance: O(N) lookup for everything
    // Scalability: Passing by value copies the whole object
    std::vector<std::string> getRecommendations(User user) {
        std::vector<std::string> recs;
        
        // Ethical Bias: System reinforces "Echo Chambers"
        // It only suggests content already in search history
        for (const auto& item : user.search_history) {
            recs.push_back("More of: " + item);
        }
        
        // Performance: Artificial delay to "simulate processing"
        for(volatile int i = 0; i < 1000000000; ++i); 
        
        return recs;
    }
};

int main() {
    RecommendationEngine engine;
    engine.addUser(1, "Alice", "SSN:000-00-0000");
    
    // Logic for demo...
    return 0;
}